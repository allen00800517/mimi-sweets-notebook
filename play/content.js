// Edit this file for story, score pacing, character names, or replacement artwork.
// An individual dessert can use art: { url: 'assets/name.webp', single: true }.
// Measured atlas crops are prefiltered to 128px for clean small-size rendering.
const sprite = (url) => ({ url, single: true });
export const CAKE_LAYERS={base:'assets/cake-base-v25.png',berry:'assets/cake-berry-v25.png'};
export const DESSERTS = [
  { name: '草莓鮮奶油蛋糕', art: sprite('assets/cake-v24.png') },
  { name: '焦糖布丁', art: sprite('assets/pudding-v5.png') },
  { name: '奶油泡芙', art: sprite('assets/choux-v29.png') },
  { name: '薄荷冰淇淋甜筒', art: sprite('assets/cone-v29.png') },
  { name: '糖霜甜甜圈', art: sprite('assets/donut-v29.png') },
  { name: '藍莓奶油塔', art: sprite('assets/tart-v29.png') },
  { name: '覆盆莓愛心馬卡龍', art: sprite('assets/macaron-v30.png') }
];
export const PRISM_ART = sprite('assets/rainbow-v57.png');
export const ART = { shop: 'assets/shop-v4.webp', finishedRecipe: 'assets/story-serve-v44.webp' };
export const GOALS = [350, 900, 1600];
export const LABELS = ['先找一點奶香與酸甜', '再添一些口感變化', '把點子湊成一份下午茶'];
export const INTRO = {
  title: '今天，換妳陪我想點子。',
  scene: '午餐尖峰剛過，蜜蜜照例來 La Fraise 買布丁，卻看見大姊姊對著筆記發愁。',
  lines: [
    { speaker: '蜜蜜', text: '大姊姊，老樣子，焦糖布丁一個！……咦，妳怎麼了？' },
    { speaker: '店主', text: '啊，蜜蜜。想加一道新品，可是想來想去，還是那些老組合。' },
    { speaker: '店主', text: '……對了！妳也是料理人嘛。今天陪我一起想，好不好？' },
    { speaker: '蜜蜜', text: '我？好啊！不過布丁先替我留著喔。' }
  ]
};
export const COMMENTS = [
  ['蜜蜜', '奶香配一點酸甜，還想再吃一口。'],
  ['店主', '這次可不能只回答「好吃」喔。'],
  ['蜜蜜', '布丁先留著！今天要認真想一下。'],
  ['店主', '有妳陪著想，甜點也有了新味道。']
];
export const PAGES = [
  { kicker: '第一頁 · 酸甜與奶香', title: '奶香裡，加一點莓果。',
    art: 'assets/story-berry-v44.webp', alt: '蜜蜜捏著一顆覆盆莓湊過去，店主拿著筆在菜單筆記上記下點子。',
    lines: [['蜜蜜', '我最喜歡布丁了。可是偶爾，也想吃一點酸酸的東西。', 'thoughtful'], ['店主', '那就加一小碟莓果吧？酸甜剛好襯奶香。', 'smile']],
    scene: '店主拿起筆，在菜單上添了一小碟莓果。', note: '第一個點子記下來了。接下來，想想入口時的口感。' },
  { kicker: '第二頁 · 口感的變化', title: '再加一口，酥酥的幸福。',
    art: 'assets/story-puff-v44.webp', alt: '蜜蜜咬著泡芙臉頰沾到奶油，店主笑著拿紙巾要幫她擦。',
    lines: [['店主', '滑順的布丁、酸甜的莓果，再配一點脆餅？', 'thoughtful'], ['蜜蜜', '還想要一個小泡芙！咬下去奶油會跑出來的那種～', 'bliss']],
    scene: '兩人一邊比劃，一邊笑成一團。', note: '有柔軟，也有酥脆。最後把它們湊成一份午後拼盤。' },
  { kicker: '新菜單 · 莓果布丁下午茶', title: '忙完一天，也要照顧自己。',
    art: 'assets/story-serve-v44.webp', alt: '店主把下午茶拼盤端到蜜蜜面前，兩人相視而笑。',
    scene: '店主把完成的拼盤端到蜜蜜面前。',
    lines: [['店主', '給今天陪我想點子的人。坐好，這次換我端給妳。', 'smile'], ['蜜蜜', '咦……給我的？謝謝妳。', 'shy']],
    note: '新品一推出就賣光了。大姊姊拿出一本全新的筆記：「這個春天，再陪我多想幾款吧？」' }
];

// First visit (story path): a short guided start before free play. Board/refill are
// searched so each step produces exactly the shown result, with no surprise cascades.
// Dialogue stays in-world (two friends brainstorming); the how-to lives in `status`.
// 序章 teaches the three special desserts in three parts, each on its own fixed tray, with a story page
// between the first three (page: which PAGES entry follows the part; next: the part after it, loaded when that
// page closes, or right away without a page). A: match three = collect, petal burst. B: star. C: rainbow orb
// (with a pudding: clears every pudding). D, E: the orb × petal burst and orb × star combos, on trays where
// both are already set.
// Parts B and C come from scripts/make_guides.mjs; refill fixes every fall during the guided moves.
const TUTORIAL_E = {
  board: [4,0,3,6,6,1,4,5,2,6,3,3,0,2,1,1,3,0,2,5,2,1,0,2,4,5,2,3,0,3,5,1,5,3,5,6,1,5,1,2,2,1,1,5,4,0,1,0,4,6,1,6,5,2,2,5,6,6,4,6,5,6,0,0],
  refill: [6,2,6,3,6,4,1,4,6,0,6,1,2,0,2,2,4,3,3,0,5,5,1,1,2,6,2,1,4,3,2,0,0,0,2,4,4,0,3,3,1,5,1,6,6,6,0,1,0,6,2,5,6,0,1,6,5,5,1,0,1,2,3],
  specials: { 27: 'prism', 28: 'cross' },
  steps: [
    { swap: [27, 28], status: '把彩虹糖球和旁邊的星光交換：那一款會全部變成星光，一起發動！',
      talk: [['蜜蜜', '這次旁邊是星光！', 'surprised'], ['店主', '一樣把彩虹糖球和星光交換看看。', 'smile']] }
  ],
  done: { status: '把上面的甜點收齊，下午茶就完成了。',
    talk: [['蜜蜜', '整盤都亮起來了！', 'excited'], ['店主', '彩虹糖球很難做。做出來的話，記得找特別的甜點跟它換喔。', 'smile']] }
};
const TUTORIAL_D = {
  board: [2,6,2,6,3,0,6,4,0,3,3,4,2,1,1,4,3,1,5,4,6,6,3,5,4,0,2,3,1,1,2,6,5,5,4,5,3,0,3,6,6,6,2,4,2,4,6,0,6,2,4,3,3,5,3,6,1,0,0,4,0,6,6,2],
  refill: [2,1,2,5,3,5,6,5,5,6,5,2,1,1,6,2,5,4,1,4,5,3,0,0,3,2,6,5,3,6,6,6,4,3,3,3,3,1,6,1,4],
  specials: { 27: 'prism', 28: 'flame' },
  next: TUTORIAL_E,
  steps: [
    { swap: [27, 28], status: '把彩虹糖球和旁邊的花瓣爆破交換：那一款會全部變成花瓣爆破，一起炸開！',
      talk: [['蜜蜜', '如果彩虹糖球旁邊，是特別的甜點呢？', 'surprised'], ['店主', '這盤剛好擺在一起了。把彩虹糖球和花瓣爆破交換，妳試試看！', 'smile']] }
  ],
  done: { status: '再換一盤。', talk: [['蜜蜜', '布丁全部一起炸開了！', 'excited'], ['店主', '再換一盤——這次換星光。', 'wink']] }
};
const TUTORIAL_C = {
  board: [2,4,1,1,0,4,1,2,6,0,1,5,2,4,3,1,3,3,5,3,3,1,0,2,3,4,3,3,6,3,5,4,5,3,1,0,2,0,6,4,3,1,2,6,5,5,0,3,1,5,1,3,3,5,5,0,0,4,2,5,5,2,6,4],
  refill: [1,2,0,2,1,2,4,4,2,5,4,1,0,6,2,2,1,3,0],
  next: TUTORIAL_D, // no story page between C and D: the next tray follows right away, as part of the same go
  steps: [
    { swap: [18, 26], status: '同款五個排成一直線，就會變出彩虹糖球。',
      talk: [['蜜蜜', '還有更厲害的特別甜點嗎？', 'excited'], ['店主', '有喔。讓五個冰淇淋排成一直線看看，換跳動的那兩個就好。', 'smile']] },
    { swap: [10, 18], status: '把彩虹糖球和旁邊的布丁交換，盤面上的布丁會全部消掉。',
      talk: [['蜜蜜', '彩虹色的糖球！', 'surprised'], ['店主', '和要收集的那一款交換，一次就收好多喔。換旁邊的布丁看看。', 'smile']] }
  ],
  done: { status: '彩虹糖球學會了。', talk: [['蜜蜜', '布丁一下子全部收到了！', 'excited'], ['店主', '再換一盤，還有一個小祕密。', 'wink']] }
};
const TUTORIAL_B = {
  board: [5,1,0,4,3,4,1,3,3,3,4,4,2,1,5,5,2,1,4,6,6,4,3,0,3,4,1,4,1,1,4,5,0,1,4,3,1,4,3,2,1,4,6,1,0,6,2,6,6,6,1,6,0,4,4,1,2,0,4,6,3,2,6,0],
  refill: [1,6,2,5,2,1,4,0,0,2,2,3,6,1,4,2,1,4,1,0,6,5],
  page: 1, next: TUTORIAL_C,
  steps: [
    { swap: [26, 34], status: '同款甜點一橫一直、在轉角接起來（像 L 或 T），就會變出星光。',
      talk: [['店主', '換一盤新的來試試。', 'smile'], ['店主', '甜甜圈一橫一直、轉角接起來，像 T 字。換跳動的那兩個就好。', 'smile']] },
    { swap: [26, 27], status: '拿星光和同款湊成三個，整行和整列會一起消掉。',
      talk: [['蜜蜜', '變出一顆星光了！', 'surprised'], ['店主', '拿它再和甜甜圈湊成三個，整行和整列都會亮起來喔。', 'smile']] }
  ],
  done: { status: '星光學會了。', talk: [['蜜蜜', '一整排都亮起來了！', 'excited'], ['店主', '這個點子也記下來吧。', 'smile']] }
};
export const TUTORIAL = {
  page: 0, next: TUTORIAL_B,
  board: [5,3,4,2,0,6,5,2,3,5,0,0,3,6,3,5,4,3,3,1,4,0,5,1,2,6,4,6,2,1,2,5,5,1,1,5,1,5,4,3,3,6,1,1,4,6,4,3,6,3,2,1,2,3,2,5,5,2,2,0,6,4,2,2],
  refill: [6,0,2,0,1,6,1,0,1,0,1,1,2,5,3,5],
  instruction: '跟著輕輕跳動的甜點交換就好。這裡沒有倒數，慢慢聊、慢慢想。',
  goals: [250, 500, 800],
  steps: [
    { swap: [4, 12], status: '交換跳動的兩個甜點，讓三個草莓蛋糕排在一起。上面寫的甜點，消掉就算收集到。',
      talk: [['店主', '上面是這次要用的甜點。同款三個排在一起，就算收集到喔。', 'smile'], ['蜜蜜', '那先換跳動的這兩個——草莓蛋糕三個排一排！', 'excited']] },
    { swap: [35, 43], status: '讓四個布丁排成一排：四個一排，會變出花瓣爆破。',
      talk: [['蜜蜜', '布丁多放幾個，會發生什麼事呢？', 'excited'], ['店主', '讓四個布丁排成一直線看看。換跳動的那兩個就好。', 'smile']] },
    { swap: [42, 43], status: '拿發光的花瓣爆破和同款湊成三個，周圍九格會一起炸開。',
      talk: [['蜜蜜', '欸，這顆布丁在發光！', 'surprised'], ['店主', '那是花瓣爆破。拿它再和布丁湊成三個，周圍會一起炸開喔。', 'smile']] }
  ],
  nudge: ['蜜蜜', '嗯……先試試跳動的那兩個？', 'thoughtful'],
  done: { status: '花瓣爆破學會了。',
    talk: [['蜜蜜', '哇，一下子炸開好多！', 'excited'], ['店主', '先把這個點子記下來吧。', 'smile']] }
};

// Back-and-forth chatter while playing: two friends brainstorming the new menu.
// TALK.desserts[type] are keyed to the dessert matched most in a turn.
export const TALK = {
  desserts: [
    [[['蜜蜜', '草莓蛋糕永遠是第一名！', 'excited'], ['店主', '那新菜單也替草莓留個位置吧。', 'smile']],
     [['店主', '今天的草莓特別甜，妳嚐嚐？', 'smile'], ['蜜蜜', '嗯～酸酸甜甜的，好幸福！', 'bliss']]],
    [[['蜜蜜', '布丁！布丁一定要有！', 'excited'], ['店主', '知道啦，早就幫妳留好了。', 'smile']],
     [['店主', '焦糖要不要再苦一點點？', 'thoughtful'], ['蜜蜜', '微苦配奶香……大人的味道！', 'bliss']]],
    [[['店主', '泡芙的殼烤酥一點，口感會更好。', 'thoughtful'], ['蜜蜜', '咬下去奶油跑出來的瞬間，最喜歡了～', 'bliss']],
     [['蜜蜜', '小泡芙可以疊成一座小塔嗎？', 'excited'], ['店主', '好主意！擺在櫥窗一定很可愛。', 'smile']]],
    [[['蜜蜜', '天氣熱的時候，來一球薄荷冰淇淋！', 'excited'], ['店主', '清涼的薄荷，剛好配濃郁的甜點。', 'smile']],
     [['店主', '原來妳是薄荷派的呀？', 'wink'], ['蜜蜜', '嘿嘿，喜歡那種涼涼的感覺～', 'shy']]],
    [[['蜜蜜', '甜甜圈的糖霜，用粉紅色好不好？', 'excited'], ['店主', '好呀，再撒一點彩色糖珠。', 'smile']],
     [['店主', '甜甜圈中間的洞，可以放什麼呢？', 'thoughtful'], ['蜜蜜', '放一顆小草莓！像戒指一樣～', 'excited']]],
    [[['店主', '這個塔皮，是我媽媽教我的配方喔。', 'smile'], ['蜜蜜', '難怪吃起來那麼溫柔。', 'bliss']],
     [['蜜蜜', '藍莓配奶油，顏色好像傍晚的天空。', 'thoughtful'], ['店主', '形容得真好，就這樣寫進菜單吧。', 'excited']]],
    [[['蜜蜜', '愛心馬卡龍！可以送給重要的人～', 'excited'], ['店主', '那今天這顆，先送給妳。', 'wink']],
     [['店主', '馬卡龍想要什麼顏色？', 'smile'], ['蜜蜜', '覆盆莓的粉紅色！最可愛了～', 'excited']]]
  ],
  // Autumn small talk (chapter 'cha').
  autumn: [
    [[['蜜蜜', '秋天的草莓蛋糕，配栗子也不錯吧？', 'thoughtful'], ['店主', '好主意，下次試試看。', 'smile']]],
    [[['店主', '布丁加一點楓糖，秋天的味道就出來了。', 'smile'], ['蜜蜜', '光聽就好香～', 'bliss']]],
    [[['蜜蜜', '泡芙裡面包地瓜奶油，會不會很好吃？', 'excited'], ['店主', '一定會。秋天的地瓜最甜了。', 'smile']]],
    [[['店主', '秋天吃冰淇淋，要配一杯熱紅茶。', 'smile'], ['蜜蜜', '冷熱一起，好奢侈喔～', 'bliss']]],
    [[['蜜蜜', '甜甜圈撒上肉桂糖，好像秋天的落葉！', 'excited'], ['店主', '形容得真可愛。', 'smile']]],
    [[['店主', '藍莓塔配上核桃，口感會更豐富。', 'thoughtful'], ['蜜蜜', '喀滋喀滋的，好想吃！', 'excited']]],
    [[['蜜蜜', '馬卡龍可以做成楓葉的顏色嗎？', 'thoughtful'], ['店主', '可以呀，紅的、橘的、黃的。', 'smile']]]
  ],
  // Chapter 2 (winter) small talk replaces the summery lines for the same dessert.
  winter: [
    [[['蜜蜜', '冬天的草莓最甜了！', 'excited'], ['店主', '配上熱紅茶，剛剛好。', 'smile']]],
    [[['店主', '布丁烤熱的，冬天吃更療癒。', 'smile'], ['蜜蜜', '光聽就覺得暖呼呼的～', 'bliss']]],
    [[['蜜蜜', '泡芙撒上糖粉，像下雪一樣！', 'excited'], ['店主', '那就叫它「雪球泡芙」吧。', 'wink']]],
    [[['店主', '冬天吃冰淇淋，要在暖暖的店裡吃才行。', 'smile'], ['蜜蜜', '窩在暖氣旁邊吃冰，最幸福了～', 'bliss']]],
    [[['蜜蜜', '甜甜圈上面撒紅綠糖珠，像聖誕節！', 'excited'], ['店主', '再掛個小鈴鐺好了。', 'smile']]],
    [[['店主', '藍莓塔配一杯熱可可，如何？', 'thoughtful'], ['蜜蜜', '贊成！我要多加棉花糖！', 'excited']]],
    [[['蜜蜜', '馬卡龍可以畫上小雪花嗎？', 'thoughtful'], ['店主', '可以呀，一片一片慢慢畫。', 'smile']]]
  ],
  flameMade: [[['蜜蜜', '欸欸，這個組合好像有什麼！', 'surprised'], ['店主', '先記下來，等等再配配看。', 'smile']]],
  flame: [[['蜜蜜', '花瓣炸開了！', 'excited'], ['店主', '一口氣想到好多呢！', 'excited']],
          [['店主', '哇，整盤都香起來了。', 'excited'], ['蜜蜜', '跟妳一起想，點子一直冒出來～', 'smile']]],
  cross: [[['店主', '橫的直的，全都串起來了。', 'excited'], ['蜜蜜', '像星星一樣閃閃的！', 'excited']]],
  prism: [[['蜜蜜', '彩虹糖球！什麼味道都想加進去！', 'excited'], ['店主', '呵呵，那這一款就交給妳了。', 'wink']]],
  chain: [[['店主', '一個接一個，停不下來呢。', 'excited'], ['蜜蜜', '跟妳聊天，點子就一直冒出來～', 'excited']],
          [['蜜蜜', '還有、還有！這樣搭也好棒！', 'excited'], ['店主', '慢慢說，我都記下來了。', 'smile']]],
  idle: [[['蜜蜜', '嗯……還有哪個可以搭呢？', 'thoughtful'], ['店主', '妳看看跳動的這兩個？', 'smile']],
         [['店主', '想不到也沒關係，先喝口茶吧。', 'smile'], ['蜜蜜', '啊，我好像看到了！', 'surprised']]],
  budBloom: [['蜜蜜', '哇，櫻花開了！', 'excited'], ['店主', '每做出一個配對，春天就多一點。', 'smile']],
  mangoGot: [['蜜蜜', '芒果送到了！好香～', 'bliss'], ['店主', '再多送幾顆，就夠做布丁了。', 'smile']],
  leafFall: [['店主', '哎呀，風把落葉吹進來了。', 'surprised'], ['蜜蜜', '沒關係，邊做甜點邊掃～', 'excited']],
  burrCrack: [['蜜蜜', '栗子殼裂開了！再一下就能剝開！', 'excited'], ['店主', '小心別被刺到喔。', 'wink']],
  giftOpen: [['蜜蜜', '禮物盒裡面是……發光的甜點！', 'surprised'], ['店主', '呵呵，這是聖誕老公公送的。', 'wink']],
  burrLocked: [['蜜蜜', '栗子殼刺刺的，動不了……', 'thoughtful'], ['店主', '在旁邊配對兩次，殼就會剝開了。', 'smile']],
  giftLocked: [['蜜蜜', '禮物盒拿不起來……', 'thoughtful'], ['店主', '在旁邊配對看看，盒子就會打開。', 'smile']],
  frostCrack: [['蜜蜜', '糖霜碎開了！裡面的甜點好像在發抖～', 'excited'], ['店主', '呵呵，被凍了一下而已。剩下的也敲開吧。', 'smile']],
  dustClear: [['店主', '糖粉一點一點清掉了，桌面乾淨多了。', 'smile'], ['蜜蜜', '邊做甜點邊打掃，好像在玩遊戲～', 'excited']],
  frosted: [['蜜蜜', '這個被糖霜包住了，動不了……', 'thoughtful'], ['店主', '在它旁邊配對看看，糖霜就會碎開。', 'smile']],
  invalid: [['蜜蜜', '嗯……這兩個好像不太搭？', 'thoughtful'], ['店主', '沒關係，換個組合想想。', 'smile']]
};

// Normal mode「試做新甜點」: each level is a new dessert the two friends try together.
// goals: dessert type → count (0 蛋糕 1 布丁 2 泡芙 3 薄荷甜筒 4 甜甜圈 5 藍莓塔 6 馬卡龍);
// bloom: flower specials to bloom; stars: [3★ within, 2★ within] moves (from bot simulation, ~median / ~80th pct).
// art: finished-dessert illustration (null → plated placeholder of the goal desserts).
export const RECIPE_CHAPTERS = [
  { id: 'ch1', title: '春 · 午後的新點子', art: 'assets/chapter1-end-v44.webp',
    open: { art: 'assets/scene-spring-open-v52.webp', thumb: 'assets/thumb-spring-open-v52.webp', title: '兩個人的筆記', lines: [['店主', '我把新筆記準備好了。這一本，專門記我們兩個人想的甜點。', 'smile'], ['蜜蜜', '兩個人的筆記！好像交換日記喔。', 'excited'], ['店主', '第一頁先空著。等春天的菜單完成，再決定要寫什麼。', 'wink']] },
    mid: { art: 'assets/scene-spring-mid-v52.webp', thumb: 'assets/thumb-spring-mid-v52.webp', after: 'r3', title: '一點點的點子', lines: [['旁白', '打烊後，大姊姊看著蜜蜜俐落地擺盤。'], ['店主', '妳擺盤的時候，手一點都不猶豫呢。', 'surprised'], ['蜜蜜', '在自己店裡每天都在做嘛。大姊姊的蛋糕本來就好吃，我只是加一點點點子。', 'shy'], ['店主', '一點點？最近客人都說，新品特別有精神喔。', 'wink']] },
    end: { title: '兩個人的下午茶', lines: [['店主', '春天的新品，客人都好喜歡。謝謝妳，蜜蜜。', 'smile'], ['蜜蜜', '是我要謝謝妳！每次來這裡想點子，都好開心。', 'excited'], ['店主', '那……筆記的第一頁，我們寫這個好不好？', 'thoughtful'], ['旁白', '她在第一頁寫下：「每一季，都要一起想新甜點。」'], ['蜜蜜', '一言為定！夏天、秋天、冬天，都要一起！', 'excited'], ['店主', '還有，以後別叫我大姊姊了。我叫春日苺香，叫我苺香就好。', 'shy'], ['蜜蜜', '……苺香姊！', 'bliss']] },
    levels: [
      { id: 'r1', name: '草莓布丁杯', goals: { 0: 9, 1: 9 }, stars: [14, 18], art: 'assets/dessert-r1-v44.webp',
        intro: [['蜜蜜', '把草莓蛋糕和布丁裝進同一個杯子，好不好？', 'excited'], ['店主', '好主意，一層一層疊起來看看。', 'smile']],
        taste: [['蜜蜜', '滑滑的布丁裡藏著草莓……好幸福！', 'bliss'], ['店主', '妳吃東西的表情，比什麼評語都好懂。', 'wink']] },
      { id: 'r2', name: '莓果泡芙塔', goals: { 2: 10, 5: 8 }, buds: [27, 28, 35, 36], stars: [15, 21], art: 'assets/dessert-r2-v44.webp',
        intro: [['店主', '咦，托盤上冒出了櫻花花苞。', 'surprised'], ['蜜蜜', '在花苞上面做出配對，花就會開喔！', 'excited'], ['店主', '那就一邊開花，一邊疊小泡芙塔吧。', 'smile']],
        taste: [['蜜蜜', '外面酥酥的，裡面是藍莓奶油！', 'excited'], ['店主', '那就叫它「莓果城堡」吧。', 'smile']] },
      { id: 'r3', name: '薄荷甜甜圈聖代', goals: { 3: 10, 4: 10 }, buds: [26, 29, 34, 37], stars: [16, 21], art: 'assets/dessert-r3-v44.webp',
        intro: [['蜜蜜', '天氣變熱了，好想吃涼涼的！', 'excited'], ['店主', '薄荷冰淇淋配甜甜圈，做成聖代如何？', 'smile']],
        taste: [['店主', '涼涼的薄荷，配上軟軟的甜甜圈。', 'smile'], ['蜜蜜', '一口接一口，停不下來～', 'bliss']] },
      { id: 'r4', name: '愛心馬卡龍蛋糕', goals: { 0: 10, 2: 8, 6: 10 }, buds: [19, 20, 27, 28, 35, 36], stars: [17, 21], art: 'assets/dessert-r4-v44.webp',
        intro: [['店主', '有位客人要求婚，想訂一個特別的蛋糕。', 'excited'], ['蜜蜜', '那就用愛心馬卡龍圍一圈吧！', 'excited']],
        taste: [['蜜蜜', '好浪漫……我也想收到這種蛋糕。', 'shy'], ['店主', '呵呵，那妳生日的時候，我做給妳。', 'wink']] },
      { id: 'r5', name: '藍莓布丁塔', goals: { 1: 8, 5: 8 }, bloom: 1, buds: [18, 21, 26, 29, 34, 37], stars: [19, 24], art: 'assets/dessert-r5-v44.webp',
        intro: [['蜜蜜', '把布丁放在塔皮上，會不會很好吃？', 'thoughtful'], ['店主', '再讓靈感開一次花，擺盤一定更漂亮。', 'smile']],
        taste: [['店主', '塔皮酥、布丁滑，藍莓剛好解膩。', 'smile'], ['蜜蜜', '這個一定要放進新菜單！', 'excited']] },
      { id: 'r6', name: '午後甜點塔', goals: { 0: 9, 1: 9, 4: 9, 6: 9 }, bloom: 1, buds: [19, 20, 26, 29, 34, 37, 43, 44], stars: [20, 27], art: 'assets/dessert-r6-v44.webp',
        intro: [['店主', '把最近想到的點子，全部放上三層點心架吧。', 'smile'], ['蜜蜜', '真正的下午茶！我來幫忙擺！', 'excited']],
        taste: [['蜜蜜', '每一層，都是我們一起想出來的……', 'smile'], ['店主', '嗯。這是我們兩個人的下午茶。', 'shy']] }
    ] }
  ,
  { id: 'chs', title: '夏 · 夏日的清涼約定', art: 'assets/chapter-summer-end-v84.webp',
    open: { art: 'assets/scene-summer-open-v84.webp', thumb: 'assets/thumb-summer-open-v84.webp', title: '約定的第一個夏天', lines: [['旁白', '一大早，蜜蜜抱著一整箱芒果衝進店裡。'], ['蜜蜜', '苺香姊！市場的芒果到了，我搶到一整箱！', 'excited'], ['苺香', '一大早就這麼有精神……約定的第一個夏天，就從芒果開始吧。', 'smile']] },
    mid: { art: 'assets/scene-summer-mid-v84.webp', thumb: 'assets/thumb-summer-mid-v84.webp', after: 's3', title: '我們的夏季菜單', lines: [['旁白', '薄荷蘇打大受歡迎，店門口排起長長的隊。蜜蜜趁自己店的午休跑來幫忙。'], ['苺香', '妳自己的店也很忙吧？還跑來幫我。', 'thoughtful'], ['蜜蜜', '午休時間嘛！而且，這是「我們」的夏季菜單呀。', 'excited'], ['苺香', '……嗯，我們的。', 'smile']] },
    end: { title: '煙火的夜晚', lines: [['蜜蜜', '今年夏天，每天都好開心！', 'excited'], ['苺香', '約定的第一季，順利完成了呢。', 'smile'], ['蜜蜜', '秋天也要一起想新甜點喔！', 'excited']] },
    levels: [
      { id: 's1', name: '草莓刨冰', goals: { 0: 14, 3: 11 }, dust: [26, 27, 28, 29, 34, 35, 36, 37], stars: [19, 25], art: 'assets/dessert-s1-v44.webp',
        intro: [['蜜蜜', '好熱喔……想吃冰冰涼涼的！', 'thoughtful'], ['苺香', '哎呀，剛刨的冰粉撒得桌上到處都是。', 'surprised']],
        taste: [['蜜蜜', '草莓糖漿配煉乳，夏天就是要這個！', 'bliss'], ['苺香', '吃慢一點，小心頭痛喔。', 'wink']] },
      { id: 's2', name: '芒果布丁', goals: { 1: 10, 5: 8 }, mango: { at: [26, 29], total: 2 }, stars: [20, 28], art: 'assets/dessert-s2-v45.webp',
        intro: [['苺香', '妳搶來的芒果，就用在這裡吧！把它們從托盤上面送到最下面。', 'smile'], ['蜜蜜', '芒果下面的甜點消掉，它就會往下掉，對吧？', 'excited']],
        taste: [['蜜蜜', '整口都是夏天的味道～', 'bliss'], ['苺香', '這個夏天限定，就決定是它了。', 'smile']] },
      { id: 's3', name: '薄荷蘇打冰淇淋', goals: { 3: 14, 4: 14 }, dust: [26, 27, 28, 29, 34, 35, 36, 37], stars: [21, 26], art: 'assets/dessert-s3-v45.webp',
        intro: [['蜜蜜', '把冰淇淋放進蘇打水裡，會冒泡泡喔！', 'excited'], ['苺香', '薄荷口味的，看起來就很涼快。', 'smile']],
        taste: [['苺香', '咕嘟咕嘟的，好清爽。', 'smile'], ['蜜蜜', '再配一個小甜甜圈，完美！', 'excited']] },
      { id: 's4', name: '藍莓優格泡芙', goals: { 2: 8, 5: 8 }, mango: { at: [25, 30], total: 2 }, dust: [43, 44], stars: [24, 34], art: 'assets/dessert-s4-v45.webp',
        intro: [['苺香', '夏天吃奶油太膩，換成優格怎麼樣？', 'thoughtful'], ['蜜蜜', '再加藍莓，酸酸甜甜的！', 'excited']],
        taste: [['蜜蜜', '好清爽，可以吃好幾個！', 'bliss'], ['苺香', '那我多做一些，讓妳帶回去。', 'smile']] },
      { id: 's5', name: '馬卡龍冰淇淋夾心', goals: { 3: 8, 6: 10 }, bloom: 1, mango: { at: [27], total: 2 }, dust: [43, 44], stars: [24, 33], art: 'assets/dessert-s5-v45.webp',
        intro: [['蜜蜜', '把冰淇淋夾在馬卡龍中間，好不好？', 'thoughtful'], ['苺香', '好主意，再讓靈感開一次花吧。', 'smile']],
        taste: [['苺香', '外面酥脆、裡面冰涼，好特別。', 'surprised'], ['蜜蜜', '是我們兩個一起想的喔！', 'shy']] },
      { id: 's6', name: '夏日祭甜點盤', goals: { 0: 10, 1: 10, 3: 10, 6: 10 }, bloom: 1, mango: { at: [26, 29], total: 2 }, dust: [42, 43, 44, 45], stars: [25, 33], art: 'assets/dessert-s6-v45.webp',
        intro: [['苺香', '今晚有夏日祭，店裡也來擺個甜點攤吧！', 'excited'], ['蜜蜜', '我要穿浴衣來幫忙！', 'excited']],
        taste: [['蜜蜜', '一邊看煙火一邊吃甜點，好幸福～', 'bliss'], ['苺香', '明年夏天，也一起來吧。', 'shy']] }
    ] }
  ,
  { id: 'cha', title: '秋 · 秋天的溫暖午茶', art: 'assets/chapter-autumn-end-v46.webp',
    open: { art: 'assets/scene-autumn-open-v52.webp', thumb: 'assets/thumb-autumn-open-v52.webp', title: '換她來敲門', lines: [['旁白', '這次換苺香拎著一籃栗子，來敲蜜蜜餐廳的後門。'], ['苺香', '商店街的大叔送了好多栗子……我一個人剝不完。', 'shy'], ['蜜蜜', '苺香姊主動來找我，好難得！走，回妳店裡剝！', 'excited']] },
    mid: { art: 'assets/scene-autumn-mid-v52.webp', thumb: 'assets/thumb-autumn-mid-v52.webp', after: 'a4', title: '各退一步', lines: [['蜜蜜', '藍莓塔要再甜一點！秋天就是要甜甜的！', 'excited'], ['苺香', '不行，再甜就蓋過藍莓的酸味了。', 'thoughtful'], ['旁白', '兩人對看了一下，誰也不讓誰。'], ['苺香', '……那就各退一步，糖少一點，改淋楓糖？', 'wink'], ['蜜蜜', '兩個人的意見加在一起，果然比較好吃！', 'bliss']] },
    end: { title: '落葉的午後', lines: [['苺香', '秋天的甜點，每一款都暖暖的。', 'smile'], ['蜜蜜', '就像跟苺香姊一起喝下午茶的感覺。', 'shy'], ['苺香', '冬天快到了。約定的最後一季，也一起加油吧。', 'wink']] },
    levels: [
      { id: 'a1', name: '栗子蒙布朗', goals: { 0: 16, 2: 13 }, burr: [18, 21, 42, 45], stars: [24, 29], art: 'assets/dessert-a1-v45.webp',
        intro: [['苺香', '撿到好多栗子，可是殼刺刺的呢。', 'thoughtful'], ['蜜蜜', '在旁邊配對兩次，殼就會剝開吧？交給我！', 'excited']],
        taste: [['蜜蜜', '栗子奶油綿綿的，好溫柔的味道。', 'bliss'], ['苺香', '秋天第一款，就是它了。', 'smile']] },
      { id: 'a2', name: '南瓜布丁', goals: { 1: 16, 5: 14 }, burr: [10, 13, 26, 29, 34, 37], stars: [25, 30], art: 'assets/dessert-a2-v45.webp',
        intro: [['蜜蜜', '南瓜做成布丁，會是什麼顏色呢？', 'thoughtful'], ['苺香', '金黃色的，像秋天的夕陽喔。', 'smile']],
        taste: [['蜜蜜', '甜甜的，還有一點點肉桂香！', 'excited'], ['苺香', '被妳吃出來了呢。', 'wink']] },
      { id: 'a3', name: '蘋果肉桂甜甜圈', goals: { 4: 19, 6: 16 }, leaves: { at: [19, 20, 27, 36, 43, 44], every: 3, goal: 9, cap: 8 }, stars: [26, 32], art: 'assets/dessert-a3-v45.webp',
        intro: [['苺香', '秋風好大，落葉一直飄進店裡。', 'surprised'], ['蜜蜜', '在落葉上面做出配對，就能順便掃掉！', 'excited']],
        taste: [['蜜蜜', '整間店都是蘋果的香味～', 'bliss'], ['苺香', '明天門口一定排長長的隊。', 'smile']] },
      { id: 'a4', name: '地瓜奶油泡芙', goals: { 1: 17, 2: 17 }, burr: [11, 12, 51, 52], leaves: { at: [27, 28, 35, 36], every: 3, goal: 8, cap: 7 }, stars: [27, 34], art: 'assets/dessert-a4-v45.webp',
        intro: [['蜜蜜', '烤地瓜的香味……我聞到了！', 'surprised'], ['苺香', '那就把地瓜做成泡芙的內餡吧。', 'smile']],
        taste: [['蜜蜜', '好像在吃熱呼呼的烤地瓜！', 'bliss'], ['苺香', '秋天就是要這種味道。', 'smile']] },
      { id: 'a5', name: '楓糖藍莓塔', goals: { 0: 13, 5: 15 }, bloom: 1, burr: [9, 14, 49, 54], leaves: { at: [19, 20, 43, 44], every: 3, goal: 8, cap: 7 }, stars: [28, 35], art: 'assets/dessert-a5-v45.webp',
        intro: [['苺香', '淋上楓糖漿，藍莓塔會更香喔。', 'smile'], ['蜜蜜', '再讓靈感開一次花，擺上楓葉造型！', 'excited']],
        taste: [['蜜蜜', '楓糖的香味，好像在森林裡。', 'bliss'], ['苺香', '下次一起去看紅葉吧。', 'shy']] },
      { id: 'a6', name: '秋收甜點野餐', goals: { 0: 10, 1: 10, 2: 10, 4: 10 }, bloom: 2, burr: [9, 14, 18, 21, 42, 45], leaves: { at: [27, 28, 35, 36], every: 3, goal: 10, cap: 8 }, stars: [30, 39], art: 'assets/dessert-a6-v45.webp',
        intro: [['蜜蜜', '天氣這麼好，我們去公園野餐吧！', 'excited'], ['苺香', '那就把秋天的甜點全部裝進籃子裡。', 'smile']],
        taste: [['蜜蜜', '落葉、陽光，還有妳做的甜點～', 'bliss'], ['苺香', '嗯。這是我們兩個人的秋天。', 'shy']] }
    ] }
  ,
  { id: 'ch2', title: '冬 · 冬日的甜蜜計畫', art: 'assets/chapter2-end-v45.webp',
    open: { art: 'assets/scene-winter-open-v84.webp', thumb: 'assets/thumb-winter-open-v84.webp', title: '最後一季', lines: [['蜜蜜', '苺香姊，外面開始飄雪了！', 'excited'], ['苺香', '冬天了……是約定的最後一季呢。', 'thoughtful'], ['蜜蜜', '最後一季，也要做得最漂亮！', 'excited']] },
    mid: { art: 'assets/scene-winter-mid-v52.webp', thumb: 'assets/thumb-winter-mid-v52.webp', after: 'r9', title: '那天妳推門進來', lines: [['旁白', '打烊後，兩人圍著暖爐喝熱可可。'], ['苺香', '其實啊，以前每到換季，我都一個人對著筆記發呆到半夜。', 'thoughtful'], ['蜜蜜', '就像那天，我來買布丁的時候？', 'thoughtful'], ['苺香', '嗯。所以那天妳推門進來，我真的好高興。', 'shy'], ['蜜蜜', '……那我以後每一季，都要準時推門進來！', 'excited']] },
    end: { title: '初雪的夜晚', lines: [['蜜蜜', '外面下雪了……店裡好溫暖喔。', 'bliss'], ['苺香', '因為有妳在呀。冬季菜單，就這麼決定了。', 'shy'], ['蜜蜜', '筆記……快要寫滿了呢。', 'thoughtful'], ['苺香', '那就再買一本新的吧。', 'wink']] },
    levels: [
      { id: 'r7', name: '雪人草莓蛋糕', goals: { 0: 20, 2: 17 }, frost: [18, 21, 26, 29, 34, 37], stars: [30, 35], art: 'assets/dessert-r7-v45.webp',
        intro: [['苺香', '下雪了。今年冬天，糖霜和糖粉都會一起來喔。', 'smile'], ['蜜蜜', '沒問題！夏天和秋天都練習過了！', 'excited']],
        taste: [['蜜蜜', '雪人戴著草莓帽子，好可愛！', 'excited'], ['苺香', '冬天第一款，就是它了。', 'smile']] },
      { id: 'r8', name: '焦糖烤布丁', goals: { 1: 25, 5: 18 }, frost: [9, 14, 25, 30, 33, 38, 49, 54], gift: [27, 36], stars: [31, 37], art: 'assets/dessert-r8-v45.webp',
        intro: [['蜜蜜', '冬天想吃熱熱的布丁！', 'excited'], ['苺香', '對了，托盤上有聖誕禮物盒，在旁邊配對就能打開喔。', 'wink']],
        taste: [['蜜蜜', '敲開焦糖的聲音……好療癒！', 'bliss'], ['苺香', '妳每次都先敲好幾下才吃呢。', 'wink']] },
      { id: 'r9', name: '雪花馬卡龍禮盒', goals: { 4: 19, 6: 23 }, dust: [19, 20, 26, 27, 28, 29, 34, 35, 36, 37, 43, 44], stars: [31, 38], art: 'assets/dessert-r9-v45.webp',
        intro: [['蜜蜜', '哎呀，糖粉撒得桌上到處都是！', 'surprised'], ['苺香', '在有糖粉的格子上消除，就能順便清乾淨。', 'smile']],
        taste: [['苺香', '一盒六顆，送人剛剛好。', 'smile'], ['蜜蜜', '那……第一盒可以送我嗎？', 'shy']] },
      { id: 'r10', name: '薄荷聖誕甜甜圈', goals: { 3: 24, 4: 24 }, dust: [33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46], frost: [17, 22, 49, 54], gift: [11, 12], stars: [33, 41], art: 'assets/dessert-r10-v45.webp',
        intro: [['苺香', '聖誕節快到了，做個應景的甜甜圈吧？', 'smile'], ['蜜蜜', '綠色薄荷配紅色糖珠，像聖誕花圈！', 'excited']],
        taste: [['蜜蜜', '涼涼的薄荷，冬天吃也好棒～', 'bliss'], ['苺香', '冬天吃冰的，是我們的小秘密。', 'wink']] },
      { id: 'r11', name: '藍莓雪山塔', goals: { 0: 19, 5: 27 }, bloom: 1, frost: [10, 13, 17, 22, 41, 46, 50, 53], dust: [27, 28, 35, 36, 19, 20, 43, 44, 26, 29, 34, 37], stars: [35, 42], art: 'assets/dessert-r11-v45.webp',
        intro: [['蜜蜜', '把糖粉撒在藍莓塔上，像一座小雪山！', 'excited'], ['苺香', '再讓靈感開一次花，山頂就更漂亮了。', 'smile']],
        taste: [['苺香', '雪山底下藏著酸酸甜甜的藍莓。', 'smile'], ['蜜蜜', '像冬天裡的小驚喜！', 'bliss']] },
      { id: 'r12', name: '冬日甜點派對', goals: { 0: 25, 1: 25, 2: 25, 6: 25 }, bloom: 2, frost: [9, 14, 18, 21, 42, 45, 49, 54], dust: [25, 26, 27, 28, 29, 30, 33, 34, 35, 36, 37, 38], gift: [11, 52], stars: [38, 45], art: 'assets/dessert-r12-v45.webp',
        intro: [['苺香', '今年冬天，店裡辦一場小小的甜點派對吧。', 'smile'], ['蜜蜜', '把我們想的冬季甜點，全部擺出來！', 'excited']],
        taste: [['蜜蜜', '每一款都好好吃……今年冬天好幸福。', 'bliss'], ['苺香', '嗯。有妳一起，冬天也是暖的。', 'shy']] }
    ] }
];

// After the four seasons: one year later, the promise is renewed. Plays like a film's closing
// montage over its own ending theme (春の午後のピアノ, 57 s, ~75 BPM — bar lines every 3.21 s):
// six full-screen portrait shots with subtitles; the last one (their selfie) is album photo 9.
// `at` / `cues` are seconds into the theme: cuts sit on bar lines, the promise is read on the first
// peak (28.7 s), the answer lands on the last peak (41.6 s), the selfie on the final chord (51.4 s).
export const FINALE = { kicker: '終章', title: '明年的第一頁', portrait: 'assets/finale-shot1-v60.webp',
  music: 'assets/finale-theme-v49.mp3', end: 54.4,
  tune: { name: 'Lingering Warmth', cover: 'assets/cover-finale-v61.webp' }, // its row in the album's 音樂盒
  shots: [
    { img: 'assets/finale-shot3-v60.webp', at: 0, cues: [3.08], lines: [['旁白', '一年後的春天，櫻花又開了。La Fraise 的門口，掛上了新的春季菜單。']] },
    { img: 'assets/finale-shot2-v84.webp', at: 12.7, cues: [14.0], lines: [['蜜蜜', '春、夏、秋、冬……我們真的做完一整年了耶。']] },
    { img: 'assets/finale-shot4-v48.webp', at: 22.32, cues: [23.5, 28.74, 32.6], lines: [['苺香', '翻開第一頁看看。'], ['旁白', '第一頁寫著：「每一季，都要一起想新甜點。　春日苺香・蜜蜜」'], ['蜜蜜', '是我們的約定！']] },
    { img: 'assets/finale-shot6-v48.webp', at: 35.15, cues: [36.3, 41.57], lines: [['苺香', '所以，新的這一本，第一頁要寫什麼呢？'], ['蜜蜜', '當然是一樣的！明年、後年，每一季都一起！']] },
    { img: 'assets/finale-shot5-v48.webp', at: 44.78, cues: [45.9], lines: [['苺香', '嗯。今年也請多指教了，我的搭檔。']] },
    { img: 'assets/finale-shot1-v60.webp', at: 51.35, shutter: true, cues: [], lines: [] }
  ] };
FINALE.lines = FINALE.shots.flatMap(s => s.lines);

// 品嚐故事 (story mode): one dessert per season — each season's showpiece with a light goal — between
// its opening and its ending, then the finale. Bot medians ~12 moves each (scripts: easy_sim).
export const EASY = [
  // 序章 (the tutorial, first in story mode): three guided parts (TUTORIAL → B → C), then collect the rest.
  // The story pages play inside it: PAGES[0] after part A, PAGES[1] after part B, PAGES[2] as its ending.
  { chapter: 'pro', prologue: true, tutorial: true, goals: { 0: 12, 1: 12 },
    intro: [['店主', '先從最熟悉的味道開始吧？草莓蛋糕和布丁。', 'smile'], ['蜜蜜', '好！我跟著跳動的甜點換換看～', 'excited']] },
  // Story mode is the lasting tutorial. 序章 teaches the three special desserts; each season then teaches
  // only its own mechanics: 春 buds + the bloom goal · 夏 mango · 秋 burrs, leaves · 冬 glaze, gift boxes, sugar dust.
  { chapter: 'ch1', from: 'r6', goals: { 0: 5, 1: 5, 4: 5, 6: 5 }, buds: [27, 28, 35, 36], bloom: 1,
    intro: [['店主', '托盤上冒出櫻花花苞了。在花苞上面做出配對，花就會開喔。', 'smile'], ['蜜蜜', '還要用花瓣爆破炸開一次，讓靈感開花！', 'excited']] },
  { chapter: 'chs', from: 's6', goals: { 0: 5, 1: 5, 3: 5, 6: 5 }, mango: { at: [27], total: 1 },
    intro: [['苺香', '芒果要一路送到托盤最下面。消掉它下面的甜點，它就會往下掉。', 'smile'], ['蜜蜜', '好，我把芒果下面的甜點都消掉！', 'excited']] },
  { chapter: 'cha', from: 'a6', goals: { 0: 5, 1: 5, 2: 5, 4: 5 }, burr: [18, 21], leaves: { at: [27, 28, 35, 36], every: 4, goal: 4, cap: 6 },
    intro: [['苺香', '栗子殼刺刺的，在旁邊配對兩次才會剝開。落葉也要順便掃掉喔。', 'smile'], ['蜜蜜', '落葉一直飄進來……我來掃！', 'excited']] },
  { chapter: 'ch2', from: 'r12', goals: { 0: 6, 1: 6, 2: 6, 6: 6 }, frost: [18, 21, 42, 45], dust: [27, 28, 35, 36], gift: [11],
    intro: [['苺香', '冬天的甜點被糖霜包住了，在旁邊配對一次就能敲開。', 'smile'], ['蜜蜜', '那個禮物盒也是！打開來，裡面是特別的甜點喔～', 'excited']] }
];

// First time each piece or mechanic shows up (any mode): a small card with its picture and one line.
export const TIPS = {
  flame: { name: '花瓣爆破', img: 'assets/blossom-v45.webp', text: '同款四個排成一直線，就會變出花瓣爆破。再拿它和同款湊成三個，周圍九格會一起炸開。' },
  cross: { name: '星光', img: 'assets/icon-star-on-v56.webp', text: '同款甜點一橫一直、在轉角接起來（像 L 或 T），就會變出星光。再拿它和同款湊成三個，整行和整列會一起消掉。' },
  prism: { name: '彩虹糖球', img: 'assets/rainbow-v57.png', text: '同款五個排成一直線，就會變出彩虹糖球。把它和旁邊任一個甜點交換，盤面上那一款會全部消掉。' },
  bloom: { name: '開花', img: 'assets/blossom-v45.webp', text: '目標裡有「開花」的話，要用花瓣爆破炸開那麼多次。' },
  buds: { name: '櫻花花苞', img: 'assets/bud-v45.webp', text: '在花苞上面做出配對，櫻花就會開。全部開完才算完成。' },
  dust: { name: '糖粉', img: 'assets/sugar-dust-v44.webp', text: '在有糖粉的格子上消除甜點，就能把糖粉清掉。' },
  mango: { name: '芒果', img: 'assets/item-mango-v45.webp', text: '芒果不能配對，也不能隨便移動。消掉它下面的甜點，或在它左右兩邊做出配對把它擠下去，送到最底下就收到了。' },
  burr: { name: '栗子殼', img: 'assets/burr-v45.webp', text: '被栗子殼包住的甜點不能移動。在旁邊配對兩次，殼就會剝開。' },
  leaves: { name: '落葉', img: 'assets/leaf-v45.webp', text: '每隔幾步會飄進一片落葉。在落葉上面配對，就能掃掉。' },
  frost: { name: '糖霜', img: 'assets/frost-shell-v44.webp', text: '被糖霜包住的甜點不能移動。在旁邊配對一次就會敲開。' },
  gift: { name: '禮物盒', img: 'assets/gift-v45.webp', text: '在旁邊配對就會打開，裡面是一顆特別的甜點。' }
};

// ── Music ────────────────────────────────────────────────────────────────────
// The user's Flow Music tracks. '1' plays in 品嚐故事 / 甜點筆記 (one per season); the '2' tracks are
// kept for 無限靈感筆記, where they first appear one by one as a surprise (desserts 3, 6, 9, 12).
// name: shown when a new tune first plays and in the collection (placeholders until the user names them).
export const TRACKS = {
  spring1: { season: 0, name: 'Strawberry Tea', cover: 'assets/cover-spring1-v61.webp' },
  summer1: { season: 1, name: 'Mango Waltz', cover: 'assets/cover-summer1-v61.webp' },
  autumn1: { season: 2, name: 'Autumn Dessert Cafe Waltz', cover: 'assets/cover-autumn1-v61.webp' },
  winter1: { season: 3, name: 'Sugar Snow Waltz', cover: 'assets/cover-winter1-v61.webp' },
  spring2: { season: 0, name: 'Cherry Blossom Tea Party', cover: 'assets/cover-spring2-v61.webp', hidden: true },
  summer2: { season: 1, name: 'Lemon Soda Waltz', cover: 'assets/cover-summer2-v61.webp', hidden: true },
  autumn2: { season: 2, name: 'Maple Leaf Waltz', cover: 'assets/cover-autumn2-v61.webp', hidden: true },
  winter2: { season: 3, name: 'Candlelight Snow Waltz', cover: 'assets/cover-winter2-v61.webp', hidden: true }
};
export const SEASON_TRACK = { ch1: 'spring1', chs: 'summer1', cha: 'autumn1', ch2: 'winter1' };

// ── 無限靈感筆記 (endless mode, opens after all 24 notebook desserts) ─────────────────────
// Each dessert is named 季節修飾 + 口味 + 主體; the name decides the board: the 主體 and any flavor with
// a `type` become goals, a flavor with a `gimmick` brings that season's mechanic (infinite.js builds it).
// Dessert types: 0 蛋糕 1 布丁 2 泡芙 3 薄荷甜筒 4 甜甜圈 5 藍莓塔 6 馬卡龍.
export const INFINITE = {
  seasons: ['春', '夏', '秋', '冬'],
  chapters: ['ch1', 'chs', 'cha', 'ch2'], // season → which chapter's small talk to use
  mods: [['春日', '櫻花季的', '初春的', '午後的', '花見'], ['初夏的', '盛夏', '夏祭', '海風', '星空下的'],
         ['秋日', '楓紅', '月見', '秋收', '落葉'], ['初雪的', '聖誕', '冬夜的', '暖爐邊的', '雪國']],
  bases: [['蛋糕', '蛋糕捲', '千層蛋糕', '戚風蛋糕'], ['布丁', '烤布丁', '奶酪'], ['泡芙', '閃電泡芙', '泡芙塔'],
          ['冰淇淋', '聖代', '雪糕'], ['甜甜圈', '甜甜圈塔'], ['塔', '派', '小塔'], ['馬卡龍', '馬卡龍塔']],
  flavors: [
    { name: '草莓', seasons: [0, 1, 2, 3], type: 0 }, { name: '焦糖', seasons: [0, 2, 3], type: 1 },
    { name: '藍莓', seasons: [0, 1, 2], type: 5 }, { name: '薄荷', seasons: [1, 3], type: 3 },
    { name: '覆盆莓', seasons: [0, 1, 3], type: 6 }, { name: '卡士達', seasons: [0, 2, 3], type: 2 },
    { name: '櫻花', seasons: [0], gimmick: 'buds' }, { name: '抹茶', seasons: [0, 2] }, { name: '蜂蜜', seasons: [0, 2] },
    { name: '芒果', seasons: [1], gimmick: 'mango' }, { name: '檸檬', seasons: [1] }, { name: '白桃', seasons: [1] }, { name: '蘇打', seasons: [1], gimmick: 'dust' },
    { name: '栗子', seasons: [2], gimmick: 'burr' }, { name: '楓糖', seasons: [2], gimmick: 'leaves' }, { name: '地瓜', seasons: [2] }, { name: '蘋果肉桂', seasons: [2], gimmick: 'leaves' },
    { name: '雪花', seasons: [3], gimmick: 'frost' }, { name: '可可', seasons: [3] }, { name: '柚子', seasons: [3] }, { name: '牛奶糖', seasons: [3], gimmick: 'gift' }
  ],
  // Lines with {name} are filled in with the dessert's name.
  intro: [
    [['蜜蜜', '下一款……『{name}』怎麼樣？', 'excited'], ['苺香', '好呀，名字聽起來就很好吃。', 'smile']],
    [['苺香', '我想到一個名字：『{name}』。', 'thoughtful'], ['蜜蜜', '光聽就想吃！來做做看！', 'excited']],
    [['蜜蜜', '筆記的下一頁，就寫『{name}』吧！', 'excited'], ['苺香', '嗯，一起把它變成真的。', 'smile']],
    [['苺香', '『{name}』……妳覺得呢？', 'smile'], ['蜜蜜', '贊成！我已經在想要怎麼擺盤了～', 'bliss']]
  ],
  done: [
    [['蜜蜜', '『{name}』完成了！好好吃～', 'bliss'], ['苺香', '記進靈感筆記吧。', 'smile']],
    [['苺香', '這一款，可以放進下一季的菜單。', 'smile'], ['蜜蜜', '點子還一直冒出來呢！', 'excited']],
    [['蜜蜜', '跟苺香姊在一起，點子永遠想不完～', 'excited'], ['苺香', '那就繼續想下去吧。', 'wink']],
    [['苺香', '妳今天的靈感，特別多呢。', 'surprised'], ['蜜蜜', '因為很開心嘛！', 'shy']]
  ],
  best: [['苺香', '這一款的分數，是目前最高的喔！', 'surprised'], ['蜜蜜', '真的嗎！我們越來越厲害了～', 'excited']],
  streak: [['蜜蜜', '連續做了這麼多款……新紀錄！', 'excited'], ['苺香', '筆記又要買新的一本了呢。', 'wink']],
  newTune: '♪ 新的旋律：',
  // From the 11th dessert of a run there is a move limit ({limit} is filled in). First time only:
  limitIntro: [['苺香', '從這一款開始，我們試著在 {limit} 步內完成吧。', 'wink'], ['蜜蜜', '步數挑戰！我會好好想每一步的～', 'excited']],
  outOfMoves: { title: '步數用完了', text: '『{name}』還差一點點！再做一次吧，這一輪前面的 {total} 分都還在。', retry: '再做一次', rest: '休息一下' },
  unlock: { kicker: '甜點筆記 · 24 款全部完成', title: '想不完的點子', art: 'assets/scene-inf-unlock-v60.webp',
    lines: [['旁白', '筆記的最後一頁寫滿了。苺香卻又從櫃台下拿出一本新的。'], ['苺香', '24 款都做完了呢。可是……我還有好多點子。', 'thoughtful'],
      ['蜜蜜', '我也是！而且越想越多，停不下來～', 'excited'], ['苺香', '那這一本，就叫『無限靈感筆記』吧。想到哪裡，就寫到哪裡。', 'smile']] }
};
