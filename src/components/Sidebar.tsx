'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navGroups = [
  {
    label: 'Dashboard',
    items: [
      { name: 'Overview', href: '/' },
    ],
  },
  {
    label: 'Schedule Management',
    items: [
      { name: 'Calendar', href: '/calendar' },
      { name: 'Import Schedule', href: '/import-schedule' },
    ],
  },
  {
    label: 'Speaker Tools',
    items: [
      { name: 'Speaker Upload', href: '/speaker-upload' },
    ],
  },
  {
    label: 'Admin Tools',
    items: [
      { name: 'Upload Status', href: '/admin-uploads' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-white border-r border-gray-200 w-64 min-h-screen flex flex-col py-8 px-4">
      <div className="mb-8">
        <span className="text-2xl font-bold text-blue-700">Conference</span>
      </div>
      <nav className="flex-1">
        {navGroups.map(group => (
          <div key={group.label} className="mb-6">
            <div className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">{group.label}</div>
            <ul>
              {group.items.map(item => (
                <li key={item.name} className="mb-1">
                  <Link
                    href={item.href}
                    className={`block px-4 py-2 rounded font-medium ${
                      pathname === item.href
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
