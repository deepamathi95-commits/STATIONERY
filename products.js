// Product data. Emoji + pastel colour stand in for photos so nothing can break offline.
// To use real photos, add an "img" path (e.g. "assets/images/pen.jpg") to a product.
const CATS = [
  ['Pens and Pencils','✏️'],['Notebooks and Diaries','📓'],['School Stationery','🎒'],['Office Supplies','🗂️'],
  ['Art and Craft Materials','🎨'],['Geometry Boxes','📐'],['Markers and Highlighters','🖍️'],['Files and Folders','📁'],
  ['Gift Items','🎁'],['Planners and Journals','📅']
];
// id doubles as "newest" order. p = price, o = original price, r = rating, pop = popularity
const PRODUCTS = [
  {id:1,img:'assets/images/p1.svg',n:'Classmate Notebook',c:'Notebooks and Diaries',p:60,o:75,r:4.6,pop:95,e:'📓',d:'180-page single-line notebook with smooth, bleed-free paper.'},
  {id:2,img:'assets/images/p2.svg',n:'Blue Ball Pen (Pack of 10)',c:'Pens and Pencils',p:90,o:110,r:4.4,pop:98,e:'🖊️',d:'Smooth-writing ball pens with comfortable grip.'},
  {id:3,img:'assets/images/p3.svg',n:'Gel Pen Set',c:'Pens and Pencils',p:150,o:199,r:4.5,pop:80,e:'🖋️',d:'12 vibrant gel pens for notes and journaling.'},
  {id:4,img:'assets/images/p4.svg',n:'HB Pencil Pack',c:'Pens and Pencils',p:80,o:100,r:4.3,pop:85,e:'✏️',d:'Pack of 10 dark, break-resistant HB pencils.'},
  {id:5,img:'assets/images/p5.svg',n:'Color Pencils (24 shades)',c:'Art and Craft Materials',p:180,o:240,r:4.7,pop:88,e:'🖍️',d:'Rich, blendable colours for drawing and shading.'},
  {id:6,img:'assets/images/p6.svg',n:'Sketch Pens',c:'Markers and Highlighters',p:220,o:280,r:4.5,pop:70,e:'🖊️',d:'Set of 24 washable fine-tip sketch pens.'},
  {id:7,img:'assets/images/p7.svg',n:'Geometry Box',c:'Geometry Boxes',p:140,o:180,r:4.6,pop:90,e:'📐',d:'Compass, divider, set squares, protractor and ruler in a sturdy tin.'},
  {id:8,img:'assets/images/p8.svg',n:'Sticky Notes',c:'Office Supplies',p:99,o:130,r:4.2,pop:66,e:'🗒️',d:'Five pastel pads, 100 sheets each.'},
  {id:9,img:'assets/images/p9.svg',n:'Highlighter Set',c:'Markers and Highlighters',p:160,o:210,r:4.4,pop:75,e:'🖍️',d:'6 pastel highlighters with chisel tips.'},
  {id:10,img:'assets/images/p10.svg',n:'A4 Paper Pack (500 sheets)',c:'Office Supplies',p:350,o:420,r:4.5,pop:92,e:'📄',d:'75 GSM bright white paper for printers and copiers.'},
  {id:11,img:'assets/images/p11.svg',n:'Art Brush Set',c:'Art and Craft Materials',p:260,o:340,r:4.4,pop:60,e:'🖌️',d:'12 brushes in assorted sizes for paint and ink.'},
  {id:12,img:'assets/images/p12.svg',n:'Watercolor Kit',c:'Art and Craft Materials',p:399,o:520,r:4.8,pop:82,e:'🎨',d:'24 colour cakes with brush and mixing palette.'},
  {id:13,img:'assets/images/p13.svg',n:'Spiral Notebook',c:'Notebooks and Diaries',p:120,o:150,r:4.3,pop:72,e:'📒',d:'A5 spiral-bound notebook with 200 ruled pages.'},
  {id:14,img:'assets/images/p14.svg',n:'Office File Folder',c:'Files and Folders',p:85,o:110,r:4.1,pop:55,e:'📁',d:'Durable A4 file folder with 20 clear pockets.'},
  {id:15,img:'assets/images/p15.svg',n:'Desk Organizer',c:'Office Supplies',p:449,o:599,r:4.6,pop:64,e:'🗃️',d:'Multi-compartment organizer for pens, notes and clips.'},
  {id:16,img:'assets/images/p16.svg',n:'Correction Pen',c:'School Stationery',p:45,o:55,r:4.0,pop:58,e:'✒️',d:'Quick-dry metal-tip correction pen.'},
  {id:17,img:'assets/images/p17.svg',n:'Eraser and Sharpener Set',c:'School Stationery',p:50,o:65,r:4.2,pop:68,e:'🧽',d:'Dust-free erasers with a safety sharpener.'},
  {id:18,img:'assets/images/p18.svg',n:'Scientific Calculator',c:'School Stationery',p:799,o:999,r:4.7,pop:78,e:'🧮',d:'240 functions, two-line display, ideal for exams.'},
  {id:19,img:'assets/images/p19.svg',n:'Planner Diary',c:'Planners and Journals',p:299,o:399,r:4.6,pop:84,e:'📔',d:'Weekly planner with goal pages and sticker sheet.'},
  {id:20,img:'assets/images/p20.svg',n:'Craft Paper Set',c:'Art and Craft Materials',p:175,o:230,r:4.3,pop:50,e:'📜',d:'100 sheets of coloured craft paper in 20 shades.'},
  {id:21,img:'assets/images/p21.svg',n:'Gift Hamper',c:'Gift Items',p:699,o:899,r:4.8,pop:74,e:'🎁',d:'Notebook, pens, sticky notes and washi tape in a gift box.'},
  {id:22,img:'assets/images/p22.svg',n:'Gratitude Journal',c:'Planners and Journals',p:249,o:null,r:4.5,pop:62,e:'📖',d:'Guided daily journal with a soft cover.'}
];
