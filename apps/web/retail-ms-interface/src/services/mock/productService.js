import { delay, seededRandom, randomInRange } from './helpers';
import { PRODUCTS } from '../../data/products';

export async function getProductPerformance(storeId = 'cfc') {
  await delay(350);
  const rng = seededRandom(storeId.charCodeAt(0) * 130 + new Date().getDate());

  const funnel = [
    { stage: 'Zone Visitors', value: 2840, color: '#06b6d4' },
    { stage: 'Product Engagement', value: 1650, color: '#3b82f6' },
    { stage: 'Product Pick-up', value: 890, color: '#8b5cf6' },
    { stage: 'Basket Addition', value: 520, color: '#f59e0b' },
    { stage: 'Purchase', value: 380, color: '#10b981' },
    { stage: 'Return', value: 12, color: '#ef4444' },
  ];

  const totalViews = funnel[0].value;
  const engagementRate = parseFloat((funnel[1].value / totalViews * 100).toFixed(1));
  const pickupRate = parseFloat((funnel[2].value / funnel[1].value * 100).toFixed(1));
  const purchaseConversion = parseFloat((funnel[4].value / totalViews * 100).toFixed(1));
  const returnRate = parseFloat((funnel[5].value / funnel[4].value * 100).toFixed(1));
  const lostSales = Math.round((funnel[2].value - funnel[4].value) * 2200);

  const products = PRODUCTS.map(p => {
    const engagement = randomInRange(10, 200, rng);
    const pickups = Math.round(engagement * (0.2 + rng() * 0.5));
    const basketAdds = Math.round(pickups * (0.3 + rng() * 0.5));
    const sales = Math.round(basketAdds * (0.5 + rng() * 0.4));
    const returns = rng() > 0.85 ? randomInRange(1, 4, rng) : 0;
    const convRate = engagement > 0 ? parseFloat((sales / engagement * 100).toFixed(1)) : 0;
    const stock = randomInRange(0, 50, rng);

    let recommendation = 'Performing well';
    let flag = null;
    if (engagement > 80 && convRate < 15) {
      recommendation = 'High engagement but low conversion — review pricing or display';
      flag = 'high_engagement_low_conversion';
    } else if (sales > 10 && stock < 5) {
      recommendation = 'High sales velocity with low stock — prioritize replenishment';
      flag = 'high_sales_low_stock';
    } else if (engagement < 20 && stock > 20) {
      recommendation = 'Low engagement — consider better placement or promotion';
      flag = 'low_engagement';
    } else if (returns > 2) {
      recommendation = 'Above-average return rate — investigate quality or expectations';
      flag = 'high_returns';
    } else if (pickups > 30 && sales < 5) {
      recommendation = 'Frequently picked up but not purchased — pricing barrier?';
      flag = 'pickup_no_purchase';
    }

    const trend = rng() > 0.5 ? 'up' : rng() > 0.3 ? 'stable' : 'down';

    return {
      ...p,
      engagement, pickups, basketAdds, sales, returns,
      conversion: convRate, stock, recommendation, flag, trend,
      revenue: sales * p.price,
    };
  });

  return {
    kpis: {
      productViews: totalViews, engagementRate, pickupRate,
      purchaseConversion, returnRate, lostSales,
    },
    funnel,
    products: products.sort((a, b) => b.engagement - a.engagement),
  };
}
