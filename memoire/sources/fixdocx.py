import re, zipfile, shutil, sys
src=sys.argv[1]; tmp=src+'.tmp'
zin=zipfile.ZipFile(src); zout=zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED)
for it in zin.infolist():
    data=zin.read(it.filename)
    if it.filename=='word/document.xml':
        x=data.decode()
        def fix(m):
            inner=m.group(1)
            ps=re.search(r'<w:pStyle [^>]*/>',inner)
            if ps and ps.start()>0:
                inner=ps.group(0)+inner[:ps.start()]+inner[ps.end():]
                # sectPr doit être en fin de pPr
                sp=re.search(r'<w:sectPr>.*?</w:sectPr>',inner)
                if sp: inner=inner[:sp.start()]+inner[sp.end():]+sp.group(0)
            return '<w:pPr>'+inner+'</w:pPr>'
        x=re.sub(r'<w:pPr>((?:(?!</w:pPr>).)*)</w:pPr>',fix,x,flags=re.S)
        data=x.encode()
    zout.writestr(it,data)
zout.close(); shutil.move(tmp,src)
