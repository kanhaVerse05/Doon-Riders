'use client';

import Image from 'next/image';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Camera,
  Tag,
  Users,
  UserCog,
  Contact,
  BarChart3,
  ShieldCheck,
  LogOut,
  Sparkles,
  Boxes,
  Ticket,
  Wrench,
  CheckCircle2,
  LucideIcon
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const getInitials = (nameStr?: string) => {
  if (!nameStr) return 'DR';
  const parts = nameStr.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { hasPermission, user, logout } = useAuth();

  const isSalesExec = user?.roleName === 'SALES_EXECUTIVE';
  const isTechnician = user?.roleName === 'TECHNICIAN' || user?.roleName?.includes('TECH');

  const navGroups: NavGroup[] = isTechnician
    ? [
        {
          title: 'TECHNICIAN WORKSPACE',
          items: [
            {
              name: 'Job Work Summary',
              href: '/admin/technician/jobs',
              icon: CheckCircle2,
              badge: 'My Tasks'
            }
          ]
        }
      ]
    : [
        {
          title: 'OVERVIEW',
          items: [
            {
              name: 'Dashboard',
              href: '/admin/dashboard',
              icon: LayoutDashboard,
              permission: 'dashboard.view'
            },
            {
              name: 'Repair Jobs',
              href: '/admin/repair-jobs',
              icon: Wrench,
              permission: 'repairs.view',
              badge: 'Hub'
            },
            {
              name: 'Pre-Bookings',
              href: '/admin/pre-bookings',
              icon: Ticket,
              permission: 'pre_bookings.view',
              badge: '₹499'
            },
            {
              name: 'Inventory',
              href: '/admin/inventory',
              icon: Boxes,
              permission: 'inventory.view',
              badge: 'Stock'
            },
            {
              name: 'Vehicle Gallery',
              href: '/admin/gallery',
              icon: Camera,
              permission: 'fleet.view',
              badge: 'New'
            },
            {
              name: 'Pricing Plans',
              href: '/admin/pricing',
              icon: Tag,
              permission: 'settings.view',
              badge: '₹1699'
            }
          ]
        },
        {
          title: 'LEADS & CRM',
          items: [
            {
              name: isSalesExec ? 'My Assigned Leads' : 'All Inbound Leads',
              href: '/admin/leads',
              icon: Users,
              permission: 'leads.view',
              badge: isSalesExec ? 'Mine' : undefined
            },
            {
              name: 'Lead Assignment',
              href: '/admin/leads/assign',
              icon: UserCog,
              permission: 'leads.assign'
            },
            {
              name: 'Customers Directory',
              href: '/admin/customers',
              icon: Contact,
              permission: 'customers.view'
            }
          ]
        },
        {
          title: 'ANALYTICS & ACCESS',
          items: [
            {
              name: 'Reports & Attribution',
              href: '/admin/reports',
              icon: BarChart3,
              permission: 'reports.view'
            },
            {
              name: 'Team Directory',
              href: '/admin/users',
              icon: Users,
              permission: 'users.view'
            },
            {
              name: 'Roles & Permissions',
              href: '/admin/roles',
              icon: ShieldCheck,
              permission: 'roles.view'
            }
          ]
        }
      ];

  return (
    <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col justify-between hidden md:flex flex-shrink-0 h-screen sticky top-0 select-none shadow-[1px_0_4px_rgba(0,0,0,0.02)] z-30">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#E5E7EB] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center p-1 shadow-sm">
            <Image
              src="/images/doon-riders-logo.png"
              alt="DOON RIDERS"
              width={34}
              height={24}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="font-heading font-black text-sm tracking-wider uppercase text-[#111827] block">
              DOON <span className="text-[#00A854]">RIDERS</span>
            </span>
            <span className="text-[10px] font-bold text-[#00A854] tracking-widest uppercase block">
              CRM PORTAL
            </span>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="p-3 space-y-6 flex-1">
          {navGroups.map((grp, gIdx) => {
            const visibleItems = grp.items.filter(item => !item.permission || hasPermission(item.permission));
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-extrabold text-[#98A2B3] tracking-widest uppercase mb-2">
                  {grp.title}
                </p>
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                        isActive
                          ? 'bg-[#EAFBF2] text-[#00A854] font-bold border border-[#00D96B]/30 shadow-sm'
                          : 'text-[#475467] hover:bg-[#F7F9FA] hover:text-[#111827]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-[#00A854]' : 'text-[#98A2B3] group-hover:text-[#111827]'
                        }`} />
                        <span>{item.name}</span>
                      </div>

                      {item.badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-[#00D96B] text-white'
                            : 'bg-[#F1F5F9] text-[#667085]'
                        }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer User Widget */}
      <div className="p-4 border-t border-[#E5E7EB] bg-[#F7F9FA]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854] font-black text-xs shadow-sm flex-shrink-0">
              {user?.avatarUrl && !user.avatarUrl.includes('doon-riders-logo') ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span>{getInitials(user?.name)}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111827] truncate">
                {user?.name || 'Staff User'}
              </p>
              <p className="text-[10px] text-[#00A854] font-bold uppercase truncate">
                {user?.roleDisplayName || 'Team Member'}
              </p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Logout"
            className="p-1.5 rounded-lg text-[#98A2B3] hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
