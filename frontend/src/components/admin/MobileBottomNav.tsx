'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Contact,
  MoreHorizontal,
  BarChart3,
  LogOut,
  X,
  ShieldCheck,
  Camera,
  Tag,
  Ticket,
  Boxes,
  Wrench,
  CheckCircle2,
  Home,
  ClipboardList,
  User,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const isSalesExec = user?.roleName === 'SALES_EXECUTIVE';
  const isTechnician = user?.roleName === 'TECHNICIAN' || user?.roleName?.includes('TECH');
  const isHubIncharge = user?.roleName === 'HUB_INCHARGE' || user?.roleName?.includes('HUB');

  const navItems = isTechnician
    ? [
        {
          name: 'My Tasks',
          href: '/admin/technician/jobs',
          icon: Home,
          show: true
        },
        {
          name: 'Profile',
          href: '#profile',
          icon: User,
          show: true,
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-technician-profile'));
            }
          }
        }
      ]
    : isHubIncharge
    ? [
        {
          name: 'Complaints',
          href: '/admin/complaints',
          icon: AlertCircle,
          show: true
        },
        {
          name: 'Repair Jobs',
          href: '/admin/repair-jobs',
          icon: Wrench,
          show: true
        },
        {
          name: 'Returns',
          href: '/admin/returns',
          icon: RotateCcw,
          show: true
        },
        {
          name: 'Inventory',
          href: '/admin/inventory',
          icon: Boxes,
          show: true
        },
        {
          name: 'Profile',
          href: '#profile',
          icon: User,
          show: true,
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-technician-profile'));
            }
          }
        }
      ]
    : [
        {
          name: 'Dashboard',
          href: '/admin/dashboard',
          icon: LayoutDashboard,
          show: hasPermission('dashboard.view')
        },
        {
          name: 'Repair Jobs',
          href: '/admin/repair-jobs',
          icon: Wrench,
          show: hasPermission('repairs.view')
        },
        {
          name: isSalesExec ? 'My Leads' : 'Leads',
          href: '/admin/leads',
          icon: Users,
          show: hasPermission('leads.view')
        },
        {
          name: 'Customers',
          href: '/admin/customers',
          icon: Contact,
          show: hasPermission('customers.view')
        },
        {
          name: 'More',
          href: '#more',
          icon: MoreHorizontal,
          show: true,
          onClick: () => setShowMoreSheet(true)
        }
      ].filter(item => item.show);

  const moreItems = [
    { name: 'Scooty Returns', href: '/admin/returns', icon: RotateCcw, show: true },
    { name: 'Complaints', href: '/admin/complaints', icon: AlertCircle, show: hasPermission('complaints.view') },
    { name: 'Pre-Bookings', href: '/admin/pre-bookings', icon: Ticket, show: hasPermission('pre_bookings.view') },
    { name: 'Inventory', href: '/admin/inventory', icon: Boxes, show: hasPermission('inventory.view') },
    { name: 'Pricing Plans', href: '/admin/pricing', icon: Tag, show: hasPermission('settings.view') },
    { name: 'Vehicle Gallery', href: '/admin/gallery', icon: Camera, show: hasPermission('fleet.view') },
    { name: 'Reports & Attribution', href: '/admin/reports', icon: BarChart3, show: hasPermission('reports.view') },
    { name: 'Team Directory', href: '/admin/users', icon: Users, show: hasPermission('users.view') },
    { name: 'Roles & Permissions', href: '/admin/roles', icon: ShieldCheck, show: hasPermission('roles.view') },
  ].filter(item => item.show);

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-2 pb-1.5 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-around">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === '/admin/technician/jobs' && pathname?.startsWith('/admin/technician/jobs')) ||
              (item.href !== '/admin/technician/jobs' && item.href !== '#profile' && item.href !== '#logout' && pathname?.startsWith(item.href));

            if (item.onClick) {
              return (
                <button
                  key={idx}
                  onClick={item.onClick}
                  className="flex flex-col items-center justify-center gap-1 text-[#98A2B3] hover:text-[#00A854] cursor-pointer transition"
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                  <span className="text-[10px] font-semibold">{item.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={idx}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 transition ${
                  isActive ? 'text-[#00A854] font-bold' : 'text-[#98A2B3] hover:text-[#111827]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                <span className="text-[10px]">{item.name}</span>
              </Link>
            );
          })}
        </div>
        <div className="w-32 h-1 bg-gray-900/80 rounded-full mx-auto mt-2 mb-0.5" />
      </div>

      {showMoreSheet && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end">
          <div className="bg-white rounded-t-3xl w-full p-6 space-y-5 animate-slideUp">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <span className="font-bold text-sm text-[#111827]">More Administration</span>
              <button onClick={() => setShowMoreSheet(false)} className="p-1 text-[#98A2B3]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {moreItems.map((item, idx) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={() => setShowMoreSheet(false)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition ${
                      isActive
                        ? 'bg-[#EAFBF2] text-[#00A854] border-[#00D96B]/40 font-bold'
                        : 'bg-[#F7F9FA] border-[#E5E7EB] text-[#475467]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#00A854]" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#111827]">{user?.name || 'Ankit Kumar'}</p>
                <p className="text-[10px] text-[#00A854] font-bold">{user?.roleDisplayName || 'Super Admin'}</p>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
