import { useEffect, useState } from "react";
import { Search, User, Settings, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationSystem } from "@/components/reports/NotificationSystem";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps = {}) {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setUserProfile(profile || { email: user.email });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const initials = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name[0]}${userProfile.last_name[0]}`
    : userProfile?.email?.[0]?.toUpperCase() || 'U';

  const displayName = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile?.email || 'User';

  return (
    <div className="flex h-16 items-center justify-between border-b border-[hsl(0,0%,18%)] bg-[hsl(0,0%,10%)] px-4 md:px-6">
      {/* Hamburger menu for mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden mr-2 text-[hsl(40,20%,90%)] hover:bg-[hsl(0,0%,15%)] hover:text-[hsl(40,50%,70%)]"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      {/* Search Bar */}
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(40,10%,45%)]" />
          <Input
            placeholder="Search deals, contacts..."
            className="pl-10 bg-[hsl(0,0%,15%)] border-[hsl(0,0%,20%)] text-[hsl(40,20%,90%)] placeholder:text-[hsl(40,10%,45%)] focus:border-[hsl(40,50%,45%)] focus:ring-[hsl(40,50%,45%)] focus:ring-1"
          />
        </div>
      </div>
      
      {/* Right side actions */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Notifications */}
        <div className="hidden sm:block">
          <NotificationSystem />
        </div>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-[hsl(40,40%,35%)] hover:border-[hsl(40,50%,55%)] transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatars/01.png" alt="@user" />
                <AvatarFallback className="bg-[hsl(0,0%,15%)] text-[hsl(40,50%,70%)] text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-56 bg-[hsl(0,0%,12%)] border-[hsl(0,0%,20%)] text-[hsl(40,20%,90%)]" 
            align="end" 
            forceMount
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-[hsl(40,50%,75%)]">{displayName}</p>
                <p className="text-xs leading-none text-[hsl(40,10%,50%)]">
                  {userProfile?.email || ''}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[hsl(0,0%,20%)]" />
            <DropdownMenuItem 
              onClick={() => navigate('/settings')}
              className="hover:bg-[hsl(0,0%,18%)] focus:bg-[hsl(0,0%,18%)] cursor-pointer"
            >
              <User className="mr-2 h-4 w-4 text-[hsl(40,50%,55%)]" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigate('/settings')}
              className="hover:bg-[hsl(0,0%,18%)] focus:bg-[hsl(0,0%,18%)] cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4 text-[hsl(40,50%,55%)]" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[hsl(0,0%,20%)]" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="hover:bg-[hsl(0,0%,18%)] focus:bg-[hsl(0,0%,18%)] cursor-pointer text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
