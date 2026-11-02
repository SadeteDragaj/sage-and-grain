/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT_HOME?: string;
  readonly VITE_ADSENSE_SLOT_LIST?: string;
  readonly VITE_ADSENSE_SLOT_ARTICLE_1?: string;
  readonly VITE_ADSENSE_SLOT_ARTICLE_2?: string;
  readonly VITE_ADSENSE_SLOT_ARTICLE_3?: string;
  readonly VITE_ADSENSE_SLOT_MOBILE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
