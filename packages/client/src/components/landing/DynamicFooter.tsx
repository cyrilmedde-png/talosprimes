'use client';

import Link from 'next/link';
import { Workflow } from 'lucide-react';

interface FooterConfig {
  companyName?: string;
  description?: string;
  columns?: { title: string; links: { text: string; href: string }[] }[];
  copyright?: string;
  legalLinks?: { text: string; href: string }[];
}

export function DynamicFooter({ config }: { config?: FooterConfig }) {
  const companyName = config?.companyName || 'TalosPrimes';
  const description = config?.description || "Plateforme de gestion d'entreprise automatisée.";
  const columns = config?.columns || [];
  const copyrightTemplate = config?.copyright || '© {year} {companyName}. Tous droits réservés.';
  const copyright = copyrightTemplate
    .replace('{year}', new Date().getFullYear().toString())
    .replace('{companyName}', companyName);

  return (
    <footer className="bg-slate-950 text-slate-400 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className={`grid sm:grid-cols-2 lg:grid-cols-${Math.min(columns.length + 1, 4)} gap-8 mb-10`}>
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center">
                <Workflow className="w-4 h-4 text-slate-400" />
              </div>
              <span className="font-semibold text-slate-200">{companyName}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
          </div>
          {columns.map((col, i) => (
            <div key={i}>
              <h3 className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-3">{col.title}</h3>
              <ul className="space-y-2 text-sm">
                {col.links.map((link, j) => {
                  const isAnchor = link.href.startsWith('#');
                  return (
                    <li key={j}>
                      {isAnchor ? (
                        <a href={link.href} className="hover:text-slate-200 transition">{link.text}</a>
                      ) : (
                        <Link href={link.href} className="hover:text-slate-200 transition">{link.text}</Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>{copyright}</span>
          {config?.legalLinks && config.legalLinks.length > 0 && (
            <div className="flex gap-4">
              {config.legalLinks.map((link, i) => (
                <Link key={i} href={link.href} className="hover:text-slate-300 transition">{link.text}</Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
