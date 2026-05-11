import { useEffect } from "react";
import { usePageTitle } from "../contexts/PageTitleContext";

export function usePageTitleOnMount(title) {
  const { setPageTitle } = usePageTitle();

  useEffect(() => {
    setPageTitle(title);
  }, [setPageTitle, title]);
}
