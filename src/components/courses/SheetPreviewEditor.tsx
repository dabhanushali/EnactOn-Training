import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ChevronDown, 
  ChevronRight, 
  Pencil, 
  Trash2, 
  Save, 
  X,
  FileText,
  Video,
  Link as LinkIcon,
  FileType,
  AlertCircle
} from "lucide-react";
import { ParsedCourseData, ParsedModule, ParsedContentItem } from "@/lib/sheetParser";

interface SheetPreviewEditorProps {
  data: ParsedCourseData;
  onSave: (editedData: ParsedCourseData) => void;
  onBack: () => void;
}

export function SheetPreviewEditor({ data, onSave, onBack }: SheetPreviewEditorProps) {
  const [editedData, setEditedData] = useState<ParsedCourseData>(data);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]));
  const [editingModule, setEditingModule] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<{ moduleIdx: number; contentIdx: number } | null>(null);

  const toggleModule = (idx: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedModules(newExpanded);
  };

  const updateCourseName = (name: string) => {
    setEditedData({
      ...editedData,
      course: { ...editedData.course, course_name: name }
    });
  };

  const updateCourseDescription = (description: string) => {
    setEditedData({
      ...editedData,
      course: { ...editedData.course, course_description: description }
    });
  };

  const updateModule = (moduleIdx: number, field: keyof ParsedModule, value: any) => {
    const newModules = [...editedData.modules];
    newModules[moduleIdx] = { ...newModules[moduleIdx], [field]: value };
    setEditedData({ ...editedData, modules: newModules });
  };

  const deleteModule = (moduleIdx: number) => {
    const newModules = editedData.modules.filter((_, idx) => idx !== moduleIdx);
    // Reorder remaining modules
    newModules.forEach((mod, idx) => {
      mod.module_order = idx + 1;
    });
    setEditedData({ ...editedData, modules: newModules });
  };

  const deleteContent = (moduleIdx: number, contentIdx: number) => {
    const newModules = [...editedData.modules];
    newModules[moduleIdx].contents = newModules[moduleIdx].contents.filter((_, idx) => idx !== contentIdx);
    // Reorder remaining contents
    newModules[moduleIdx].contents.forEach((content, idx) => {
      content.content_order = idx + 1;
    });
    setEditedData({ ...editedData, modules: newModules });
  };

  const updateContent = (moduleIdx: number, contentIdx: number, field: keyof ParsedContentItem, value: any) => {
    const newModules = [...editedData.modules];
    newModules[moduleIdx].contents[contentIdx] = {
      ...newModules[moduleIdx].contents[contentIdx],
      [field]: value
    };
    setEditedData({ ...editedData, modules: newModules });
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'Video': return <Video className="h-4 w-4" />;
      case 'PDF': return <FileType className="h-4 w-4" />;
      case 'Document': return <FileText className="h-4 w-4" />;
      case 'External Link': return <LinkIcon className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const warnings = [];
  if (editedData.modules.length === 0) {
    warnings.push("No modules found. Please add at least one module.");
  }
  editedData.modules.forEach((mod, idx) => {
    if (mod.contents.length === 0) {
      warnings.push(`Module "${mod.module_name}" has no content items.`);
    }
  });

  return (
    <div className="space-y-6">
      {/* Course Details */}
      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Course Name</label>
            <Input
              value={editedData.course.course_name}
              onChange={(e) => updateCourseName(e.target.value)}
              placeholder="Enter course name"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Course Description</label>
            <Textarea
              value={editedData.course.course_description}
              onChange={(e) => updateCourseDescription(e.target.value)}
              placeholder="Enter course description"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Modules Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Modules ({editedData.modules.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editedData.modules.map((module, moduleIdx) => (
            <div key={moduleIdx} className="border rounded-lg">
              {/* Module Header */}
              <div className="flex items-start gap-3 p-4 bg-muted/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleModule(moduleIdx)}
                  className="p-0 h-6 w-6"
                >
                  {expandedModules.has(moduleIdx) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                
                <div className="flex-1 space-y-2">
                  {editingModule === moduleIdx ? (
                    <div className="space-y-2">
                      <Input
                        value={module.module_name}
                        onChange={(e) => updateModule(moduleIdx, 'module_name', e.target.value)}
                        placeholder="Module name"
                      />
                      <Textarea
                        value={module.module_description}
                        onChange={(e) => updateModule(moduleIdx, 'module_description', e.target.value)}
                        placeholder="Module description"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setEditingModule(null)}>
                          <Save className="h-3 w-3 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingModule(null)}>
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">
                          {moduleIdx + 1}. {module.module_name}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          {module.contents.length} items
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {module.estimated_duration_minutes} min
                        </Badge>
                      </div>
                      {module.module_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {module.module_description}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {editingModule !== moduleIdx && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingModule(moduleIdx)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteModule(moduleIdx)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Module Contents */}
              {expandedModules.has(moduleIdx) && (
                <div className="p-4 space-y-2 bg-background">
                  {module.contents.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No content items</p>
                  ) : (
                    module.contents.map((content, contentIdx) => (
                      <div
                        key={contentIdx}
                        className="flex items-start gap-3 p-3 border rounded-md bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="text-muted-foreground mt-1">
                          {getContentIcon(content.content_type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {editingContent?.moduleIdx === moduleIdx && editingContent?.contentIdx === contentIdx ? (
                            <div className="space-y-2">
                              <Input
                                value={content.content_title}
                                onChange={(e) => updateContent(moduleIdx, contentIdx, 'content_title', e.target.value)}
                                placeholder="Content title"
                              />
                              <Input
                                value={content.content_url}
                                onChange={(e) => updateContent(moduleIdx, contentIdx, 'content_url', e.target.value)}
                                placeholder="Content URL (optional)"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => setEditingContent(null)}>
                                  <Save className="h-3 w-3 mr-1" /> Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingContent(null)}>
                                  <X className="h-3 w-3 mr-1" /> Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{content.content_title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {content.content_type}
                                </Badge>
                              </div>
                              {content.content_description && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  {content.content_description}
                                </p>
                              )}
                              {content.content_url && (
                                <a
                                  href={content.content_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline break-all"
                                >
                                  {content.content_url}
                                </a>
                              )}
                            </>
                          )}
                        </div>

                        {!editingContent && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingContent({ moduleIdx, contentIdx })}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteContent(moduleIdx, contentIdx)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={onBack}>
          ← Back to URL
        </Button>
        <Button 
          onClick={() => onSave(editedData)}
          disabled={editedData.modules.length === 0 || !editedData.course.course_name.trim()}
        >
          Save Course →
        </Button>
      </div>
    </div>
  );
}
