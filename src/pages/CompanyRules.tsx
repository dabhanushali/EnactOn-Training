import { useAuth } from '@/hooks/auth-utils';
import { CompanyRulesManager } from '@/components/common/CompanyRulesManager';
import { CompanyRulesViewer } from '@/components/common/CompanyRulesViewer';

const CompanyRules = () => {
  const { profile } = useAuth();
  
  const isHR = profile?.role?.role_name === 'HR';
  const isManagement = profile?.role?.role_name === 'Management';
  const isPreJoining = profile?.current_status === 'Pre-Joining';

  return (
    <div className="container mx-auto py-8 px-4">
      {(isHR || isManagement) ? (
        <CompanyRulesManager />
      ) : (
        <CompanyRulesViewer />
      )}
    </div>
  );
};

export default CompanyRules;