import MonkeyMaster from './main.js';
import loadJsonFile from 'https://deno.land/x/load_json_file@v1.0.0/mod.ts';

const CONFIG = await loadJsonFile('conf.json');

const sendNotify = async function(text, desp, params = {}) {
    if (CONFIG.bark) {
        await fetch(
            `https://api.day.app/${CONFIG.bark}/${encodeURIComponent(text)}/${encodeURIComponent(desp)}?sound=shake&${querystring.stringify(params)}`
        );
    }

    if (CONFIG.sckey) { 
        await fetch(
            `https://sc.ftqq.com/${CONFIG.sckey}.send?text=${text}&desp=${desp}`
        );
    }
}

// '输入抢购skuid[*件数]，sku可以是多个，以逗号(,)分割，如中括号里所示，输入不需要带括号：',
// '100016691566, 100015521042*3'
let skuids = CONFIG.skuids.trim().split(',');

const ins = new MonkeyMaster({
    skuids,
    password: CONFIG.orderDeps.password,
    areaId: CONFIG.orderDeps.area,
    eid: CONFIG.orderDeps.eid,
    fp: CONFIG.orderDeps.fp,
});

await ins.init();


// 该商品需要实名认证才可抢购的情况 无法通过金融通道秒杀
// '选择运行模式: 1-有货下单, 2-按时下单, 3-提前秒杀, 默认为1',
// '1'
const mode = CONFIG.mode

switch (mode) {
    case '1':
        // '设置库存监控间隔最大时间, 系统将在此时间内随机刷新 单位秒',
        // 5
        const interval = CONFIG.mode_1.interval
        const buyFunc = skuids.length > 1 ? 'buyMultiSkusInStock' : 'buySingleSkuInStock';

        if (await ins[buyFunc](interval)) {
            await sendNotify('Yes, you got it 🍌🍌🍌🍌🍌');
            Deno.exit();
        }

        break;

    case '2':
        // '选择下单方式，1: 京东 web, 2: 京东金融 APP', '1'
        const buyOnTimeFunc = CONFIG.mode_2.orderType === '1' ? 'buyOnTime' : 'fqkillOnTime';
        // '输入抢购开始时间, 格式为 yyyy-MM-dd HH:mm:ss.SSS'        
        const buyTime = (await ins.getBuyTime()) || CONFIG.orderTime;

        console.log('请确保购物车中待抢购商品已删除!!!');

        // 自动预约
        if (ins.autoReserve) {
            await ins.reserveAll();
        }
        await ins[buyOnTimeFunc](buyTime);

        // 是否立即运行有货下单模式进行捡漏 y/n', 'n'
        CONFIG.mode_2.toMode1 ? await ins.buySingleSkuInStock() : Deno.exit();

        break;

    case '3':
        // '输入抢购开始时间, 格式为 yyyy-MM-dd HH:mm:ss.SSS'
        const secKillTime = (await ins.getBuyTime()) || CONFIG.orderTime;

        if (await ins.seckillOnTime(secKillTime)) {
            await sendNotify('Yes, you got it 🍌🍌🍌🍌🍌');
            Deno.exit();
        }

        break;

    default:
        break;
}
