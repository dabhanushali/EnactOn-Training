import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileSpreadsheet, ExternalLink, Info } from "lucide-react";
import { parseGoogleSheet, ParsedCourseData } from "@/lib/sheetParser";

interface SheetImportDialogProps {
  onDataParsed: (data: ParsedCourseData) => void;
}

export function SheetImportDialog({ onDataParsed }: SheetImportDialogProps) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleExtract = async () => {
    if (!sheetUrl.trim()) {
      setError("Please enter a Google Sheets URL");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await parseGoogleSheet(sheetUrl);
      
      if (!result.success) {
        setError(result.error || "Failed to parse spreadsheet");
        return;
      }

      onDataParsed(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while parsing the spreadsheet");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-6 w-6 text-primary mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">Import Course from Google Sheets</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Paste your Google Sheets URL below to automatically extract course modules and content.
            </p>
            
            <div className="space-y-3">
              <Input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="font-mono text-sm"
                disabled={isLoading}
              />
              
              <Button 
                onClick={handleExtract}
                disabled={isLoading || !sheetUrl.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting Course Data...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Extract Course Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">How to use:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Create a Google Sheet with columns: <strong>Week</strong>, <strong>Training Topic</strong>, <strong>Modules</strong>, <strong>Resources</strong></li>
              <li>Make your sheet publicly accessible (Anyone with link can view)</li>
              <li>Copy the sheet URL and paste it above</li>
              <li>Click "Extract Course Data" to preview</li>
              <li>Edit the preview if needed, then save your course</li>
            </ol>
            <p className="mt-3 flex items-center gap-2 text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <a 
                href="https://docs.google.com/spreadsheets/d/1example/edit" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                View Example Template
              </a>
            </p>
            <p className="mt-2 text-muted-foreground">
              💡 <strong>Tip:</strong> Each row with a "Training Topic" creates a new module. 
              Content from "Modules" and "Resources" columns are added as content items.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
