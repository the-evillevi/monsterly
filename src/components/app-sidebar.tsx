import { LayoutDashboard, ScanLine, Settings, TicketCheck, Users } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import { SyncStatus } from '@/components/sync-status';
import { ThemeToggle } from '@/components/theme-toggle';
import { useCheckInDialog } from '@/components/check-ins/check-in-dialog-context';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { icon: TicketCheck, label: 'Visitas', path: '/day-visits' },
  { icon: Users, label: 'Suscriptores', path: '/subscribers' },
  { icon: Settings, label: 'Ajustes', path: '/settings' },
];

export function AppSidebar() {
  const { openSearch } = useCheckInDialog();
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <NavLink aria-label="Monsterly dashboard" to="/dashboard">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-lg font-black text-primary-foreground"
                >
                  M
                </span>
                <span className="text-lg font-black">Monsterly</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Dashboard">
                  <NavLink to="/dashboard">
                    <LayoutDashboard aria-hidden />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    openSearch();
                    if (isMobile) {
                      setOpenMobile(false);
                    }
                  }}
                  tooltip="Check-in"
                >
                  <ScanLine aria-hidden />
                  <span>Check-in</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.path || pathname.startsWith(`${item.path}/`)}
                    tooltip={item.label}
                  >
                    <NavLink to={item.path}>
                      <item.icon aria-hidden />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col">
          <SyncStatus compact={collapsed} />
          <ThemeToggle />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
