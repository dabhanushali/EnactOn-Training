import { useState, memo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/auth-utils';
import { UserRoles } from '@/lib/enums';
import {
  BarChart3,
  BookOpen,
  Users,
  FolderOpen,
  Calendar,
  Settings,
  LogOut,
  Menu,
  GraduationCap,
  User
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NotificationCenter } from '@/components/common/NotificationCenter';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: string[];
}

const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: BarChart3,
    href: '/dashboard',
    roles: [UserRoles.MANAGEMENT, UserRoles.HR, UserRoles.TEAM_LEAD, UserRoles.TRAINEE],
  },
  {
    label: 'Courses',
    icon: BookOpen,
    href: '/courses',
    roles: [UserRoles.MANAGEMENT, UserRoles.HR, UserRoles.TEAM_LEAD, UserRoles.TRAINEE],
  },
  {
    label: 'Employees',
    icon: Users,
    href: '/employees',
    roles: [UserRoles.MANAGEMENT, UserRoles.HR],
  },
  {
    label: 'My Team',
    icon: Users,
    href: '/my-team',
    roles: [UserRoles.TEAM_LEAD],
  },
  {
    label: 'Projects',
    icon: FolderOpen,
    href: '/projects',
    roles: [UserRoles.MANAGEMENT, UserRoles.HR, UserRoles.TEAM_LEAD, UserRoles.TRAINEE],
  },
  {
    label: 'Review Sessions',
    icon: Calendar,
    href: '/training-sessions',
    roles: [UserRoles.MANAGEMENT, UserRoles.HR, UserRoles.TEAM_LEAD, UserRoles.TRAINEE],
  },
  {
    label: 'Readiness Report',
    icon: BarChart3,
    href: '/reports/readiness',
    roles: [UserRoles.MANAGEMENT, UserRoles.HR, UserRoles.TEAM_LEAD],
  },
];

const NavItems = memo(({ items, isMobile = false, onItemClick = () => {} }: { items: NavItem[], isMobile?: boolean, onItemClick?: () => void }) => (
  <>
    {items.map((item) => {
      const Icon = item.icon;
      return (
        <NavLink
          key={item.href}
          to={item.href}
          onClick={() => onItemClick()}
          className={({ isActive }) => isActive ? 'bg-accent/80 rounded-md' : ''}
        >
          <Button
            variant="ghost"
            size={isMobile ? "lg" : "sm"}
            className={`${isMobile ? 'justify-start w-full' : ''} text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors`}
          >
            <Icon className={`${isMobile ? 'mr-3' : 'mr-2'} h-4 w-4`} />
            {item.label}
          </Button>
        </NavLink>
      );
    })}
  </>
));

export const MainNav = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userRole = profile?.role?.role_name;
  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : profile?.first_name?.[0] || 'U';

  const filteredNavItems = userRole
    ? navigationItems.filter(item => item.roles.includes(userRole))
    : navigationItems.filter(item => item.label === 'Dashboard');

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-primary p-2 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-foreground">EnactOn LMS</h1>
                <p className="text-xs text-muted-foreground -mt-1">Where reliability matters</p>
              </div>
              {userRole && (
                <div className="flex items-center gap-2 pl-3 border-l">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{userRole}</span>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <NavItems items={filteredNavItems} />
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <NotificationCenter />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-foreground font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.role?.role_name} • {profile?.department}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/employees/${profile.id}`)}>
                  <User className="mr-2 h-4 w-4" />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <div className="flex flex-col space-y-3 mt-8">
                  <NavItems items={filteredNavItems} isMobile onItemClick={() => setMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};
