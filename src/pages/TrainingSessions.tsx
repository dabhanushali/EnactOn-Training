import { MainNav } from '@/components/navigation/MainNav';
import { EnhancedTrainingSessions } from '@/components/training/EnhancedTrainingSessions';

export default function TrainingSessions() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EnhancedTrainingSessions />
      </main>
    </div>
  );
}