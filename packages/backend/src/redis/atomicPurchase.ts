import { redis } from './client';

const LUA_SCRIPT = `
local userKey = KEYS[1]
local stockKey = KEYS[2]
if redis.call('EXISTS', userKey) == 1 then
  return 'already_purchased'
end
local stock = tonumber(redis.call('GET', stockKey))
if stock == nil or stock <= 0 then
  return 'out_of_stock'
end
redis.call('DECR', stockKey)
redis.call('SET', userKey, '1')
return 'success'
`;

export async function atomicPurchase(userId: string): Promise<string> {
  const userKey = `flash_sale:user:${userId}`;
  const stockKey = 'flash_sale:stock';
  const result = await redis.eval(LUA_SCRIPT, 2, userKey, stockKey);
  return result as string;
}
