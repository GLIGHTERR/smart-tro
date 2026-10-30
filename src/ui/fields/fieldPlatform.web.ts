const autofillStyleId = "auth-field-autofill-surface";

if (typeof document !== "undefined" && !document.getElementById(autofillStyleId)) {
  const stylesheet = document.createElement("style");
  stylesheet.id = autofillStyleId;
  // WebKit owns autofill paint on the input itself, so make that paint match
  // the shell instead of allowing a credential manager to create a seam.
  stylesheet.textContent = '[data-auth-field="shell"] input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #FBC97E inset !important; -webkit-text-fill-color: #5B4126 !important; caret-color: #5B4126; }';
  document.head.append(stylesheet);
}

export const fieldPlatformProps = { dataSet: { authField: "shell" } };
// The browser paints the focus ring with :focus-within so it never changes layout.
export const fieldFocusStyle: Record<string, never> = {};
