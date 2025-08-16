What it does
Two players escrow equal amounts of $CORE.
Contract stakes the pot in stCORE while the bet is open.
An off-chain oracle posts the winner.
Winner takes the pot; half of any staking yield goes to a treasury wallet.
Contract addresses (mainnet)
Table
Copy
Token	Address
CORE	0x40375C92d9FAf44d2f9d9B9d95ba47D8E4D40e7E
stCORE	0xb3A8F0f0da9ffC65318aA39E55079796093029AD
Earn	0xf5fA1728bABc3f8D2a617397faC2696c958C3409
Deploy
bash
Copy
forge create \
  --rpc-url $CORE_RPC \
  --private-key $PRIVATE \
  src/CoreBet.sol:CoreBet \
  --constructor-args $ORACLE_EOA $TREASURY_EOA
Usage
Table
Copy
Step	Caller	Function	Notes
1	Player 1	open(amount)	Locks CORE, mints stCORE.
2	Player 2	join(betId)	Matches stake, mints more stCORE.
3	Oracle	settle(betId, winner)	Unstakes, pays winner, skims yield.
winner = address(0) refunds both players (draw).
Oracle can be changed by owner via setOracle.
Commission flow
yield / 2 → treasury wallet.
Bridge / swap logic lives outside the contract; just top up DARE however you like.
Caveats
Single-oracle: lose the key, lose the funds.
No emergency withdraw yet.
