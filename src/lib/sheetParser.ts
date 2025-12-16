import Papa from 'papaparse';

export interface ParsedContentItem {
  content_title: string;
  content_description: string;
  content_url: string;
  content_type: string;
  content_order: number;
  estimated_duration_minutes: number;
}

export interface ParsedModule {
  module_name: string;
  module_description: string;
  module_order: number;
  estimated_duration_minutes: number;
  contents: ParsedContentItem[];
}

export interface ParsedCourseData {
  success: boolean;
  error?: string;
  course: {
    course_name: string;
    course_description: string;
  };
  modules: ParsedModule[];
}

// Extract URLs from text - supports URLs with or without protocol
function extractUrls(text: string): string[] {
  if (!text) return [];
  
  // Match URLs with protocol (http:// or https://)
  const protocolUrlRegex = /(https?:\/\/[^\s\)\]<>"]+)/gi;
  
  // Match URLs without protocol (www.example.com, domain.com/path, etc.)
  // Matches: word.tld or word.tld/path where tld is 2-6 chars
  const noProtocolUrlRegex = /(?<![https?:\/\/])((?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,6}(?:\/[^\s\)\]<>"]*)?)/gi;
  
  const urls: string[] = [];
  
  // Extract URLs with protocol
  const protocolMatches = text.match(protocolUrlRegex);
  if (protocolMatches) {
    urls.push(...protocolMatches);
  }
  
  // Extract URLs without protocol and add https:// prefix
  let match;
  while ((match = noProtocolUrlRegex.exec(text)) !== null) {
    const url = match[1];
    // Check if this URL wasn't already captured with a protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    if (!urls.some(existing => existing.includes(url))) {
      urls.push(fullUrl);
    }
  }
  
  return [...new Set(urls)];
}

// Detect content type from URL
function detectContentType(url: string): string {
  if (!url) return 'Text';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.pdf')) {
    return 'PDF';
  }
  return 'External Link';
}

// Extract markdown-style links: [Label](URL)
function extractMarkdownLinks(text: string): Array<{ title: string; url: string }> {
  if (!text) return [];
  const links: Array<{ title: string; url: string }> = [];
  const markdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = markdownRegex.exec(text)) !== null) {
    links.push({
      title: match[1].trim(),
      url: match[2].trim()
    });
  }
  
  return links;
}

// Estimate duration based on content
function estimateDuration(description: string, urls: string[]): number {
  let duration = 30;

  if (description && description.length > 200) {
    duration += 30;
  }
  if (urls && urls.length > 0) {
    duration += urls.length * 15;
    if (urls.some(url => url.includes('youtube.com/playlist') || url.includes('course'))) {
      duration += 60;
    }
  }
  return Math.min(Math.max(duration, 15), 180);
}

// Convert Google Sheets URL to CSV export URL
function getCsvExportUrl(googleSheetUrl: string): string | null {
  try {
    const url = new URL(googleSheetUrl);
    const pathSegments = url.pathname.split('/');
    const spreadsheetIndex = pathSegments.indexOf('spreadsheets');
    
    if (spreadsheetIndex === -1 || spreadsheetIndex + 2 >= pathSegments.length) {
      return null;
    }
    
    const docId = pathSegments[spreadsheetIndex + 2];
    
    // Extract gid if present, otherwise default to 0
    const gidMatch = url.hash.match(/#gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
  } catch (e) {
    console.error("Invalid Google Sheet URL:", e);
    return null;
  }
}

// Extract all URLs from resources column and combine with newlines
function combineResourceUrls(resourcesText: string): string {
  if (!resourcesText) return '';
  
  const allUrls: string[] = [];
  
  // Extract markdown-style links
  const markdownLinks = extractMarkdownLinks(resourcesText);
  allUrls.push(...markdownLinks.map(link => link.url));
  
  // Extract plain URLs
  const plainUrls = extractUrls(resourcesText);
  const markdownUrls = markdownLinks.map(l => l.url);
  
  // Add plain URLs that weren't already in markdown format
  for (const url of plainUrls) {
    if (!markdownUrls.includes(url)) {
      allUrls.push(url);
    }
  }
  
  // Remove duplicates and join with newlines
  return [...new Set(allUrls)].join('\n');
}

// Main parser function
export async function parseGoogleSheet(sheetUrl: string): Promise<ParsedCourseData> {
  try {
    // Convert to CSV export URL
    const csvUrl = getCsvExportUrl(sheetUrl);
    
    if (!csvUrl) {
      return {
        success: false,
        error: 'Invalid Google Sheet URL format. Please provide a valid Google Sheets URL.',
        course: { course_name: '', course_description: '' },
        modules: []
      };
    }

    // Fetch CSV data
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        return {
          success: false,
          error: 'Spreadsheet not found or not publicly accessible. Please check the URL and sharing settings (Anyone with link can view).',
          course: { course_name: '', course_description: '' },
          modules: []
        };
      }
      return {
        success: false,
        error: `Failed to fetch spreadsheet: ${response.statusText}`,
        course: { course_name: '', course_description: '' },
        modules: []
      };
    }

    const csvText = await response.text();

    // Parse CSV
    return new Promise((resolve) => {
      Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error('CSV Parsing Errors:', results.errors);
            resolve({
              success: false,
              error: 'Errors encountered during CSV parsing. Please check the spreadsheet format.',
              course: { course_name: '', course_description: '' },
              modules: []
            });
            return;
          }

          const records = results.data as Record<string, string>[];
          const modules: ParsedModule[] = [];
          let currentModule: ParsedModule | null = null;
          let courseTitle = '';

          // Get column headers to map to indices
          const headers = results.meta.fields || [];
          const getColumnValue = (record: Record<string, string>, index: number): string => {
            if (headers.length > index) {
              return record[headers[index]] || '';
            }
            return '';
          };

          for (let i = 0; i < records.length; i++) {
            const record = records[i];

            // Use column indices: 0=Week, 1=Training Topic, 2=Modules, 3=Resources (4th column)
            const weekColumn = getColumnValue(record, 0);
            const trainingTopicColumn = getColumnValue(record, 1);
            const modulesColumn = getColumnValue(record, 2);
            const resourcesColumn = getColumnValue(record, 3); // Always use 4th column regardless of name

            // Check if this row starts a new module (has a training topic)
            if (trainingTopicColumn && trainingTopicColumn.trim()) {
              // Save previous module if it exists
              if (currentModule) {
                modules.push(currentModule);
              }

              const moduleName = trainingTopicColumn.trim();
              
              // Set course title from first module name if not set
              if (!courseTitle) {
                courseTitle = moduleName;
              }

              // Create new module
              currentModule = {
                module_name: moduleName.substring(0, 100),
                module_description: '',
                module_order: modules.length + 1,
                estimated_duration_minutes: 0,
                contents: []
              };
            }

            // Create content items for this row if we have a current module
            if (currentModule && (modulesColumn || resourcesColumn)) {
              // Extract all URLs from resources column
              const markdownLinks = extractMarkdownLinks(resourcesColumn);
              const plainUrls = extractUrls(resourcesColumn);
              const markdownUrls = markdownLinks.map(l => l.url);
              
              // Build list of all unique URLs with their titles
              const urlsWithTitles: Array<{ url: string; title: string }> = [];
              
              // Add markdown links first (they have explicit titles)
              for (const link of markdownLinks) {
                urlsWithTitles.push({ url: link.url, title: link.title });
              }
              
              // Add plain URLs that weren't in markdown format
              for (const url of plainUrls) {
                if (!markdownUrls.includes(url)) {
                  // Generate title from URL
                  const urlTitle = url.replace(/^https?:\/\//, '').split('/')[0];
                  urlsWithTitles.push({ url, title: urlTitle });
                }
              }
              
              // Append to module description
              if (modulesColumn) {
                currentModule.module_description += (currentModule.module_description ? '\n' : '') + modulesColumn;
              }

              // If there are URLs, create a separate content item for each
              if (urlsWithTitles.length > 0) {
                for (const { url, title } of urlsWithTitles) {
                  const contentType = detectContentType(url);
                  const estimatedDuration = estimateDuration('', [url]);
                  
                  const contentTitle = `${currentModule.module_name} - ${title}`.substring(0, 100);

                  const contentItem: ParsedContentItem = {
                    content_title: contentTitle,
                    content_description: modulesColumn || '',
                    content_url: url,
                    content_type: contentType,
                    content_order: currentModule.contents.length + 1,
                    estimated_duration_minutes: estimatedDuration
                  };

                  currentModule.contents.push(contentItem);
                }
              } else if (modulesColumn) {
                // No URLs, but there's content - create a text content item
                const contentTitle = currentModule.contents.length === 0 
                  ? currentModule.module_name 
                  : `${currentModule.module_name} - Part ${currentModule.contents.length + 1}`;

                const contentItem: ParsedContentItem = {
                  content_title: contentTitle.substring(0, 100),
                  content_description: modulesColumn,
                  content_url: '',
                  content_type: 'Text',
                  content_order: currentModule.contents.length + 1,
                  estimated_duration_minutes: 15
                };

                currentModule.contents.push(contentItem);
              }
            }
          }

          // Add last module if it exists
          if (currentModule) {
            modules.push(currentModule);
          }

          // Calculate module durations from their contents
          modules.forEach(module => {
            const totalDuration = module.contents.reduce((sum, content) => sum + content.estimated_duration_minutes, 0);
            module.estimated_duration_minutes = totalDuration || 30;
          });

          if (modules.length === 0) {
            resolve({
              success: false,
              error: 'No modules found in the spreadsheet. Please check the format.',
              course: { course_name: '', course_description: '' },
              modules: []
            });
            return;
          }

          resolve({
            success: true,
            course: {
              course_name: courseTitle || 'Imported Course',
              course_description: `Course imported from Google Sheets with ${modules.length} modules`
            },
            modules
          });
        }
      });
    });
  } catch (error) {
    console.error('Sheet parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      course: { course_name: '', course_description: '' },
      modules: []
    };
  }
}
