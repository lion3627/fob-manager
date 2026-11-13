import pathlib
d = pathlib.Path(__file__).parent
t = (d / 'template.html').read_text()
for tag, f in (('/*CSS*/', 'style.css'), ('/*SIM*/', 'sim.js'), ('/*UI*/', 'ui.js')):
    src = (d / f).read_text()
    assert '</script' not in src and '</style' not in src
    t = t.replace(tag, src)
out = d / 'dist'
out.mkdir(exist_ok=True)
(out / 'index.html').write_text(t)
print('built', len(t), 'bytes')
