import uno, sys, time, os
from com.sun.star.beans import PropertyValue
def pv(n,v):
    p=PropertyValue(); p.Name=n; p.Value=v; return p
local=uno.getComponentContext()
res=local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver",local)
for i in range(60):
    try:
        ctx=res.resolve("uno:socket,host=localhost,port=2002;urp;StarOffice.ComponentContext"); break
    except Exception: time.sleep(1)
smgr=ctx.ServiceManager
desk=smgr.createInstanceWithContext("com.sun.star.frame.Desktop",ctx)
src=os.path.abspath(sys.argv[1]); base=os.path.abspath(sys.argv[2])
doc=desk.loadComponentFromURL(uno.systemPathToFileUrl(src),"_blank",0,(pv("Hidden",True),))
doc.getTextFields().refresh()
idx=doc.getDocumentIndexes()
print('indexes',idx.getCount())
for _ in range(2):
    for i in range(idx.getCount()): idx.getByIndex(i).update()
    doc.refresh()
doc.storeToURL(uno.systemPathToFileUrl(base+'.docx'),(pv("FilterName","MS Word 2007 XML"),))
doc.storeToURL(uno.systemPathToFileUrl(base+'.odt'),(pv("FilterName","writer8"),))
doc.storeToURL(uno.systemPathToFileUrl(base+'.pdf'),(pv("FilterName","writer_pdf_Export"),))
doc.close(True)
