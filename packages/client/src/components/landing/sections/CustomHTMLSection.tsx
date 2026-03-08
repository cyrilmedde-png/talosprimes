'use client';

interface CustomHTMLConfig {
  html?: string;
  bgColor?: string;
}

export function CustomHTMLSection({ config }: { config: CustomHTMLConfig }) {
  if (!config.html) return null;

  return (
    <section className={`py-16 px-6 ${config.bgColor || ''}`}>
      <div className="max-w-6xl mx-auto">
        <div dangerouslySetInnerHTML={{ __html: config.html }} />
      </div>
    </section>
  );
}
