// custom smart contract NewProntera™2025
// for hackathon viewing only

#####################

pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface Earn {
    function mint(uint256 core, address val) external;
    function redeem(uint256 stCore) external;
    function withdraw() external;
}

contract CoreBet is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20  public constant CORE   = IERC20(0x40375C92d9FAf44d2f9d9B9d95ba47D8E4D40e7E);
    IERC20  public constant STCORE = IERC20(0xb3A8F0f0da9ffC65318aA39E55079796093029AD);
    Earn    public constant EARN   = Earn(0xf5fA1728bABc3f8D2a617397faC2696c958C3409);

    address public oracle;
    address public immutable treasury;

    struct Bet {
        address p1;
        address p2;
        uint256 stake;     // each side
        uint256 shares;    // total stCore minted
        bool    done;
        address winner;    // 0 == draw
    }

    mapping(uint256 => Bet) public bets;
    uint256 public id;

    event Created(uint256 indexed id, address indexed p1, uint256 stake);
    event Joined(uint256 indexed id, address indexed p2);
    event Paid(uint256 indexed id, address winner, uint256 reward);
    event Fee(uint256 indexed id, uint256 amount);

    modifier onlyOracle() {
        require(msg.sender == oracle, "!oracle");
        _;
    }

    constructor(address _oracle, address _treasury) {
        oracle   = _oracle;
        treasury = _treasury;
        CORE.safeApprove(address(EARN), type(uint256).max);
        STCORE.safeApprove(address(EARN), type(uint256).max);
    }

    function setOracle(address o) external onlyOwner {
        oracle = o;
    }

    function open(uint256 amount) external nonReentrant {
        require(amount >= 1 ether, "dust");
        uint256 betId = ++id;
        Bet storage b = bets[betId];
        b.p1    = msg.sender;
        b.stake = amount;

        CORE.safeTransferFrom(msg.sender, address(this), amount);
        uint256 pre = STCORE.balanceOf(address(this));
        EARN.mint(amount, address(0));
        b.shares = STCORE.balanceOf(address(this)) - pre;

        emit Created(betId, msg.sender, amount);
    }

    function join(uint256 betId) external nonReentrant {
        Bet storage b = bets[betId];
        require(b.p1 != address(0) && b.p2 == address(0), "bad id");
        b.p2 = msg.sender;

        CORE.safeTransferFrom(msg.sender, address(this), b.stake);
        uint256 pre = STCORE.balanceOf(address(this));
        EARN.mint(b.stake, address(0));
        b.shares += STCORE.balanceOf(address(this)) - pre;

        emit Joined(betId, msg.sender);
    }

    function settle(uint256 betId, address winner) external onlyOracle {
        Bet storage b = bets[betId];
        require(!b.done && b.p2 != address(0), "bad settle");
        require(winner == address(0) || winner == b.p1 || winner == b.p2, "bad winner");
        b.done = true;
        b.winner = winner;

        EARN.redeem(b.shares);
        EARN.withdraw();

        uint256 bal = CORE.balanceOf(address(this));
        uint256 reward = bal > b.stake * 2 ? bal - b.stake * 2 : 0;
        uint256 fee = reward / 2;
        uint256 pot = bal - fee;

        if (fee > 0) {
            CORE.safeTransfer(treasury, fee);
            emit Fee(betId, fee);
        }

        if (winner == address(0)) {
            CORE.safeTransfer(b.p1, b.stake);
            CORE.safeTransfer(b.p2, b.stake);
        } else {
            CORE.safeTransfer(winner, pot);
        }

        emit Paid(betId, winner, reward);
    }
}
