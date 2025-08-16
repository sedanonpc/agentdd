### What it does  
1. Two players lock the same amount of `$CORE`.  
2. The contract mints `stCORE` and stakes the pot.  
3. After the match, an **off-chain oracle** posts the winner.  
4. **Winner** takes the full principal.  
5. **50 % of staking rewards** are skimmed to a treasury wallet—*never* a rake on the wager itself.

---

### Main-net addresses  

| Token  | Address |
|--------|---------|
| `$CORE`   | `0x40375C92d9FAf44d2f9d9B9d95ba47D8E4D40e7E` |
| `$stCORE` | `0xb3A8F0f0da9ffC65318aA39E55079796093029AD` |
| `Earn`    | `0xf5fA1728bABc3f8D2a617397faC2696c958C3409` |

---

### Deploy  

```bash
forge create \
  --rpc-url $CORE_RPC \
  --private-key $PRIVATE \
  src/CoreBet.sol:CoreBet \
  --constructor-args $ORACLE_EOA $TREASURY_EOA
