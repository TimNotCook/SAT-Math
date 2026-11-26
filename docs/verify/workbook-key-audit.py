import json,re,subprocess
KEYS={
"1.1":["C","7","D","D","D","-5/9|-0.555","67/3|22.33","A","A","A","C","C","C","B","C","42/5|8.4|8.40","B","44/3|14.66","D","A","D","A","D","A","B"],
"1.2":["19","113","C","41","A","C","D","D","D","C","14","67","26","2775","D","D","D","D","C","A","A","C","D","C","D","B","D","A","D","D"],
"1.3":["A","A","B","B","D","B","D","D","C","A","D","D","D","A","C","A","17/4|4.25","A","C","C"],
"1.4":["A","B","A","C","4998","A","D","18","C","B","A","A","152","A","D","A","C","249","3500","B","A","C","A","A","B","C","10","D","B","60","A","D","A","78","2316"],
"1.5":["C","D","D","A","D","D"],
"1.6":["A","C","B","D","16","C"],
"2.1":["A","25","D","B","40","C","D","A","60000","176","4975","A","4.55","B","0.002|0.0024","37/50|0.74|.74","A","D","D","186","B","C","D","B","24","3500","A","192.1","C","57","B","A","108/10|54/5|10.8|10.80","729","B","B","A","B","B","15","C","A","D"],
"2.2":["D","C","D","D","D","B","C","A","1.5|1.50|3/2","C","D","C","C","B","D","B","B"],
"2.3":["B","C","C","D","D","A","D","B","B","D","D","B","B","D","C","A","B","D","D","D","B","C","A","B","C"],
"2.4":["21/250|0.084|.0840","23/50|0.46|.460","B","B","A","D","D","C","C","A","D","B","C","35/50|7/10|0.7|.70","D","1/2|0.5"],
"2.5":["B","C","C","121","85","D","C","3610","C","151/6|25.16|25.17","123","132","A","A","A","A","B","A","C","18","A","A","D","A","A","A","B","D","A"],
"3.1":["C","B","D","D","C","C","C","A","D","A","B","B","D","C","D","D","B","A","C","B","B","B","B","B","B","A","C","11/36|0.305|.305|0.306|.3055|.3056","5/72|0.069|.0694","A","D","A","B","A","18","43","-384","A","B","A","1","17","9","B","B"],
"3.2":["A","24","B","4","C","A","B","45","1/33|0.0303|.030","208","8","D","C","D","D","B","D","C","4","A","64","C","C","22","D","61","25","19","D","D","225","D","B"],
"3.3":["B","A","A","A","C","A","A","2|6|9","B","B","A","B","A","D","B","C","3","D","A","A","27","12","12","B","B","290","-121","C","A","B"],
"3.4":["D","C","22","12","-3","A","C","-266","C","60","391","C","C","A","D","A","12","B"],
"3.5":["A","A","C","C","B","C","A","B","D","D","B","A","B","B","B","A","12","B","B","D"],
"4.1":["D","164","D","C","D","127"],
"4.2":["116","A","A","65","116","26","45","D","C","A","B","C","D","B","B","B","D","A","40","B","C","85/8|10.62|10.63","C","93/95|0.978|0.979|.9789","2160"],
"4.3":["2210","4563","A","C","C","C","11094","2008","4.418","B","A","A","A","B","25","D","2209","D","705.6","A","A","C","D","C","A"],
"4.4":["13/22|0.590|.591|.5909","C","78/79","A","C","C","B","A","A","A","C","64","C","48","C","C","A","B","72/78|12/13","20/29|0.689|.690|.6896|.6897"],
"4.5":["D","D","D","5","D","C","A","B","D","-23","10","16","C","D","B"],
}
def num(s):
    s=s.strip().replace('−','-')
    m=re.fullmatch(r'-?\d+/\d+',s)
    if m:
        a,b=s.split('/');return float(a)/float(b)
    try:return float(s.replace(',',''))
    except:return None
def same(key,bank):
    kb=[x.strip() for x in key.split('|')]
    bb=[x.strip() for x in str(bank).replace(' or ','|').replace(',','|').split('|') if x.strip()]
    for k in kb:
        kk=k.upper() if len(k)==1 and k.isalpha() else None
        if kk:
            if kk in [x.upper() for x in bb]:return True
        else:
            for b in bb:
                bn=num(b)
                kn=num(k)
                if bn is not None and kn is not None:
                    if abs(bn-kn)<=0.011 or (abs(bn-kn)<=0.015*max(1,abs(kn))):return True
                if b.lower()==k.lower():return True
    return False
js='''global.window={};require("./data/questions.js");require("./data/text.js");
const out=[];for(const q of window.TD_BANK.questions){if(!q.paper.startsWith("TD 教材 · "))continue;
out.push({id:q.id,sec:q.section,no:q.no,ans:q.answer,val:q.value,type:q.type,src:q.source});}
process.stdout.write(JSON.stringify(out));'''
p=subprocess.run(['node','-e',js],capture_output=True,text=True)
data=json.loads(p.stdout)
bad=[];miss=[];n=0
for it in data:
    sec=it['sec'];no=it['no']
    K=KEYS.get(sec, KEYS.get("4.5") if sec.startswith("4.5") else None)
    if not K: miss.append(it['id']);continue
    if no>len(K): bad.append((it['id'],'NO_RANGE',no));continue
    k=K[no-1]
    b=it['val'] if it['val'] not in (None,'') else it['ans']
    n+=1
    if not same(k,b): bad.append((it['id'],sec+'#'+str(no),'key='+k,'bank='+str(it['ans'])+'/'+str(it['val']),it['src']))
print('compared',n,'mismatch',len(bad),'miss',len(miss))
for x in bad: print(x)
