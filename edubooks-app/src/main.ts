import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

window.addEventListener('unhandledrejection', (e: any) => {
  const r = e?.reason;
  const msg = (typeof r === 'string' ? r : r?.message) || '';
  const name = r?.name || '';
  if (name.includes('ChunkLoadError') || msg.includes('ChunkLoadError')) {
    e.preventDefault?.();
    location.reload();
  }
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
