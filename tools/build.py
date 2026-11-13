"""Bundle each page (index.html, ops.html) and everything it loads into one self-contained file in dist/."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
for page in ['index.html', 'ops.html']:
  html = (root / page).read_text()
  css = (root / 'src/ui/style.css').read_text()
  html = re.sub(r'<!--CSS-->.*?<!--/CSS-->', lambda m: '<style>\n' + css + '\n</style>', html, flags=re.S)
  block = re.search(r'<!--JS-->(.*?)<!--/JS-->', html, flags=re.S).group(1)
  srcs = re.findall(r'src="([^"]+)"', block)
  js = '\n'.join((root / s).read_text() for s in srcs)
  assert '</script' not in js
  html = re.sub(r'<!--JS-->.*?<!--/JS-->', lambda m: '<script>\n' + js + '\n</script>', html, flags=re.S)
  (root / 'dist').mkdir(exist_ok=True)
  (root / 'dist' / page).write_text(html)
  print('built dist/' + page, len(html), 'bytes from', len(srcs), 'scripts')
