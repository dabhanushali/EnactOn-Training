import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Shield, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyRule {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Code of Conduct': Shield,
  'Work Ethics': Users,
  'Policies': BookOpen,
  'Culture': Users,
  'Safety Guidelines': AlertCircle,
  'Communication Standards': Users
};

export const CompanyRulesViewer = () => {
  const [rules, setRules] = useState<CompanyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_rules' as any)
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules((data || []) as any);
    } catch (error: any) {
      toast.error('Failed to fetch company rules');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(rules.map(r => r.category)))];

  const filteredRules = selectedCategory === 'all' 
    ? rules 
    : rules.filter(r => r.category === selectedCategory);

  const groupedRules = filteredRules.reduce((acc, rule) => {
    if (!acc[rule.category]) {
      acc[rule.category] = [];
    }
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, CompanyRule[]>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Welcome to eNactOn</h1>
        <p className="text-lg text-muted-foreground">Where reliability matters</p>
        <p className="text-sm text-muted-foreground">Please review the following company rules and guidelines before you join</p>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {cat === 'all' ? 'All Rules' : cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-4 mt-6">
          {Object.entries(groupedRules).map(([category, categoryRules]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                {CATEGORY_ICONS[category] && (
                  (() => {
                    const Icon = CATEGORY_ICONS[category];
                    return <Icon className="h-5 w-5 text-primary" />;
                  })()
                )}
                <h3 className="text-xl font-semibold text-foreground">{category}</h3>
                <Badge variant="secondary">{categoryRules.length}</Badge>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {categoryRules.map((rule) => (
                  <Card key={rule.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{rule.title}</CardTitle>
                        {rule.priority > 5 && (
                          <Badge variant="destructive" className="ml-2">Important</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {rule.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {filteredRules.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>No Rules Available</CardTitle>
                <CardDescription>
                  There are no company rules available for this category at the moment.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};