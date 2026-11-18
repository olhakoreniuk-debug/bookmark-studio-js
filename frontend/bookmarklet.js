// Build the bookmarklet using the current frontend origin after deployment.
const target = document.querySelector("#chrome-bookmarklet");
if (target) {
  const destination = new URL("./", window.location.href).href.split("?")[0];
  const snippet = '(function(){var u=new URL(' + JSON.stringify(destination) + ');u.searchParams.set("url",location.href);u.searchParams.set("title",document.title);window.open(u.href,"_blank","noopener");})()';
  target.href = "javascript:" + snippet;
  target.title = "Drag this link to the Chrome bookmarks bar";
}
