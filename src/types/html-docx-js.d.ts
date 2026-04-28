declare module 'html-docx-js/dist/html-docx' {
  interface HtmlDocxModule {
    asBlob: (html: string, options?: any) => Blob;
  }
  const HtmlDocx: HtmlDocxModule;
  export default HtmlDocx;
}



