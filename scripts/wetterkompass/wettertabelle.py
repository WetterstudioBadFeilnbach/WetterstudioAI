from pathlib import Path
from datetime import datetime
import pandas as pd
from PIL import Image, ImageDraw, ImageFont

BASE = Path(__file__).resolve().parent
CSV = BASE / 'daten' / 'bayern_14_tage.csv'
OUT = BASE.parent.parent / 'static' / 'wetterkompass'
OUT.mkdir(exist_ok=True)
REGIONS = ['Oberbayern','Niederbayern','Oberpfalz','Oberfranken','Mittelfranken','Unterfranken','Schwaben']
W,H=3840,2160
LEFT,CW=615,225
TOP,RH=405,210

def font(size,bold=False):
    name='arialbd.ttf' if bold else 'arial.ttf'
    p=Path('C:/Windows/Fonts')/name
    if not p.exists():
        p=Path('/usr/share/fonts/truetype/dejavu')/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')
    return ImageFont.truetype(str(p),size)

def icon(d,x,y,code):
    # Draw original weather pictograms with transparency preserved.
    sun=code in (0,1,2)
    cloud=code not in (0,)
    if sun:
        d.ellipse((x+20,y+4,x+76,y+60),fill='#FFD45B')
        for dx,dy in ((48,-8),(48,72),(5,32),(91,32)):
            d.ellipse((x+dx-4,y+dy-4,x+dx+4,y+dy+4),fill='#FFD45B')
    if code in (45,48):
        for yy in (22,43,64):
            d.rounded_rectangle((x+7,y+yy,x+103,y+yy+8),radius=4,fill='#B9D6E9')
        return
    if cloud:
        d.ellipse((x+8,y+34,x+60,y+76),fill='#E6F0FA')
        d.ellipse((x+40,y+18,x+95,y+75),fill='#E6F0FA')
        d.rounded_rectangle((x+9,y+48,x+102,y+79),radius=14,fill='#E6F0FA')
    if code in (51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99):
        for xx in (25,54,82):
            d.line((x+xx,y+83,x+xx-7,y+100),fill='#4DCCFF',width=5)
    if code in (71,73,75,77,85,86):
        for xx in (25,54,82):
            d.text((x+xx,y+77),'*',font=font(29,True),fill='#C2EFFF')

def render(df,transparent):
    im=Image.new('RGBA',(W,H),(0,0,0,0) if transparent else '#081A38')
    d=ImageDraw.Draw(im)
    fg='#FFFFFF' if not transparent else '#143E63'
    secondary='#C3E2F8' if not transparent else '#20577E'
    def t(x,y,s,sz=28,c=None,b=False):
        d.text((x,y),str(s),font=font(sz,b),fill=c or fg)
    if not transparent:
        d.rounded_rectangle((65,42,3775,274),radius=30,fill='#153F68',outline='#48A5DF',width=3)
    t(105,68,'WETTERSTUDIO BAD FEILNBACH AI',67,b=True)
    t(105,161,'BAYERN-WETTERKOMPASS  |  14-TAGE-UEBERSICHT',47,c=secondary,b=True)
    dates=sorted(df['Datum'].unique())
    t(96,330,'REGION / REFERENZORT',31,c=secondary,b=True)
    t(3200,84,pd.Timestamp(dates[0]).strftime('%d.%m.')+' - '+pd.Timestamp(dates[-1]).strftime('%d.%m.%Y'),33,b=True)
    for i,date in enumerate(dates):
        x=LEFT+i*CW
        if not transparent:
            d.rounded_rectangle((x,320,x+CW-7,387),radius=9,fill='#1B5888' if i<7 else '#3A5075')
        t(x+12,335,pd.Timestamp(date).strftime('%d.%m.'),31,b=True)
    for j,region in enumerate(REGIONS):
        y=TOP+j*RH
        sub=df[df.Region==region].sort_values('Datum')
        if len(sub)!=14: raise ValueError(f'{region}: {len(sub)} statt 14 Tage')
        if not transparent:
            d.rounded_rectangle((65,y,3775,y+RH-7),radius=15,fill='#153C62' if j%2==0 else '#103254',outline='#35618B',width=2)
        t(100,y+32,region.upper(),36,b=True)
        t(100,y+90,sub.iloc[0]['Stadt'],29,c=secondary)
        for i,(_,r) in enumerate(sub.iterrows()):
            x=LEFT+i*CW
            if i>0:
                d.line((x-4,y+10,x-4,y+RH-17),fill='#487C9F' if not transparent else '#A3C3D7',width=2)
            icon(d,x+50,y+9,int(r.Wettercode))
            t(x+17,y+105,f'{round(r.Tmax_C)}°',37,c='#FFB24F',b=True)
            t(x+119,y+105,f'{round(r.Tmin_C)}°',37,c='#4FC6F4',b=True)
            t(x+17,y+159,f'{r.Niederschlag_mm:.1f} mm',25,c=secondary)
            t(x+124,y+159,f'{round(r.Wind_kmh)} km/h',22,c=secondary)
    boundary=LEFT+7*CW-5
    d.line((boundary,319,boundary,TOP+7*RH-7),fill='#FFC66E',width=5)
    if not transparent:
        d.rounded_rectangle((65,1920,3775,2080),radius=17,fill='#103254',outline='#35618B',width=2)
    t(100,1940,'TAG 1-7: WETTERVORHERSAGE',32,c='#69BFF4',b=True)
    t(1630,1940,'TAG 8-14: ERWEITERTER WETTERTREND',32,c='#FFB950',b=True)
    t(100,2000,'Woche 2: zunehmende Prognoseunsicherheit  |  Regionale Referenzorte  |  Wetterstudio Bad Feilnbach AI',25,c=secondary)
    t(100,2093,f'Datenstand: {datetime.fromtimestamp(CSV.stat().st_mtime):%d.%m.%Y %H:%M} Uhr  |  Wetterdaten: Open-Meteo (open-meteo.com)',21,c=secondary)
    filename='bayern_14_tage_tabelle_transparent.png' if transparent else 'bayern_14_tage_tabelle_4k.png'
    p=OUT/filename
    im.save(p)
    print('ERSTELLT:',p)

def main():
    if not CSV.exists(): raise FileNotFoundError(f'Daten fehlen: {CSV}')
    df=pd.read_csv(CSV)
    df['Datum']=pd.to_datetime(df['Datum'])
    if len(df)!=98 or df.Datum.nunique()!=14: raise ValueError('Erwartet: 98 Datensaetze und 14 Tage')
    render(df,False)
    render(df,True)
    print('FERTIG: Beide 4K-Wettertabellen erstellt!')

if __name__=='__main__':
    main()
