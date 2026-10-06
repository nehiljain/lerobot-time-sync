import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/host-grotesk/wght.css';
import '@fontsource-variable/martian-mono/wdth.css';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/ui.css';
import '../styles/figures.css';
import '../styles/series.css';

export function mount(Page: ComponentType) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Page />
    </StrictMode>,
  );
}
