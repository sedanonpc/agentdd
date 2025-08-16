LST_WAGERING_CONTRACT

Peer-to-peer sports bets on Core DAO with auto-staking.

What it does
Two players lock equal amounts of $CORE
The contract mints stCORE and stakes it for the duration of the bet.
An off-chain oracle (your MCP client) posts the winner
Principal goes to the winner. 50 % of any staking yield is skimmed to a treasury wallet. The rest is invisible to players.

Addresses you’ll need
CORE   : 0x40375C92d9FAf44d2f9d9B9d95ba47D8E4D40e7E
stCORE : 0xb3A8F0f0da9ffC65318aA39E55079796093029AD
Earn   : 0xf5fA1728bABc3f8D2a617397faC2696c958C3409

Quick deploy
Copy
forge create --rpc-url $CORE_RPC \
             --private-key $PRIVATE \
             src/CoreBet.sol:CoreBet \
             --constructor-args $ORACLE_EOA $TREASURY_EOA

How to use
Player 1 calls open(amount)
Player 2 calls join(betId) with the same amount in CORE
Oracle calls settle(betId, winner) after the event is decided
winner = 0x0 refunds both sides (draw)
Any other address must match one of the players.

Yield handling
All CORE is unstaked before payout.
Commission (half of the reward delta) is forwarded to treasury
Swap/bridge logic is not in scope—just wire your own hook into the treasury wallet.

Notes
Single-oracle design—rotate via setOracle
No emergency withdraw yet; if oracle is lost, funds are locked.
Uses OpenZeppelin’s SafeERC20 and ReentrancyGuard
