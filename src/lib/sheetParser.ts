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

// Extract URLs from text
function extractUrls(text: string): string[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  const matches = text.match(urlRegex);
  return matches ? [...new Set(matches)] : [];
}

// Detect content type from URL
function detectContentType(url: string): string {
  if (!url) return 'Text';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('vimeo.com')) {
    return 'Video';
  }
  if (lowerUrl.includes('.pdf')) {
    return 'PDF';
  }
  if (lowerUrl.includes('docs.google.com') || lowerUrl.includes('.docx') || lowerUrl.includes('.doc')) {
    return 'Document';
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
          let courseTitle = '';

          for (let i = 0; i < records.length; i++) {
            const record = records[i];

            // Normalize headers
            const weekColumn = record['Column 1'] || record['Week'] || record['week'] || '';
            const trainingTopicColumn = record['Training Topic'] || record['Topics'] || record['Topic'] || record['training topic'] || '';
            const modulesColumn = record['Modules'] || record['Module'] || record['modules'] || '';
            const resourcesColumn = record['Column 4'] || record['Resources'] || record['resources'] || '';

            // Check if this row has a training topic (creates a new module)
            if (trainingTopicColumn && trainingTopicColumn.trim()) {
              const moduleName = trainingTopicColumn.trim();
              
              // Set course title from first module name if not set
              if (!courseTitle) {
                courseTitle = moduleName;
              }

              // Combine all URLs from resources column
              const combinedUrls = combineResourceUrls(resourcesColumn);
              
              // Detect content type from first URL or default to Text
              const firstUrl = combinedUrls.split('\n')[0];
              const contentType = firstUrl ? detectContentType(firstUrl) : 'Text';
              
              // Extract all URLs for duration estimation
              const allUrls = combinedUrls ? combinedUrls.split('\n') : [];
              const estimatedDuration = estimateDuration(modulesColumn, allUrls);

              // Create one content item for this module
              const contentItem: ParsedContentItem = {
                content_title: moduleName.substring(0, 100),
                content_description: modulesColumn || '',
                content_url: combinedUrls,
                content_type: contentType,
                content_order: 1,
                estimated_duration_minutes: estimatedDuration
              };

              // Create module with single content item
              modules.push({
                module_name: moduleName.substring(0, 100),
                module_description: modulesColumn || '',
                module_order: modules.length + 1,
                estimated_duration_minutes: estimatedDuration,
                contents: [contentItem]
              });
            }
          }

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
