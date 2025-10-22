import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      // rpc url, change it according to your ganache configuration
      url: 'http://localhost:8545',
      // the private key of signers, change it according to your ganache user
      accounts: [
        '0xd409fa263a9453ba954d0b8daa5897c0ce3449ce95ef443d17f0968b556ceffe',
        '0x1547974dc63386a0f4778e0b923fdb8c9bebbe203515f94123f68a2df4bbe963',
        '0xeb49e12f2722511bf5390a9925bf96e0be9a17c139af7e1a95408df44be61822',
        '0xdb9aac12ad71b982c40f4a4102370d03b979377591610cc4b2e1b31f0f2eaf1e',
        '0x868270817eccf5c411b1110472d66ceef748eedca90d85682bc33caaa04c1d32',
        '0xab2cc4ac9fe8b271cdd1533aeae2a7e35abc4ba04d0e134563096cd0a5feb920',
        '0xa0469dd6b7f49eb26d3d5673b2730d4dc6b5fd9ad5124657524d5e8bc4b75ced',
        '0xcd055f846f73c24dce5976aedef3b461a92b84407ae03fc44f14ed57fe958809',
        '0x105abf6bd7f88099b8f6d26e7eb84d68ababe4ed47079e27a38e2bf390006cf3',
        '0x18f869932fa8b5b48838200c298950426422b3034c901716bda27982acd8013d',
      ]
    },
  },
};

export default config;
