import { createContext, useContext, useState, useCallback } from "react";

const PageTitleContext = createContext({
  pageTitle: "",
  setPageTitle: () => {},
});

export function PageTitleProvider({ children }) {
  const [pageTitle, setPageTitleState] = useState("");

  const setPageTitle = useCallback((title) => {
    setPageTitleState(title);
  }, []);

  return (
    <PageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  const context = useContext(PageTitleContext);
  if (!context) {
    throw new Error("usePageTitle must be used within a PageTitleProvider");
  }
  return context;
}

export function useSetPageTitle(title) {
  const { setPageTitle } = usePageTitle();

  const setTitle = useCallback(() => {
    setPageTitle(title);
  }, [setPageTitle, title]);

  return setTitle;
}
