class WalletConnector {
    constructor() {
        this.web3 = null;
        this.account = null;
        this.isConnected = false;
        this.customBalance = '0.00';
        
        this.init();
    }

    async init() {
        if (typeof window.ethereum !== 'undefined') {
            this.web3 = new Web3(window.ethereum);
            this.setupEventListeners();
            
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            if (accounts.length > 0) {
                this.account = accounts[0];
                this.isConnected = true;
                await this.updateWalletInfo();
                this.showWalletInfo();
            }
        } else {
            this.showMetaMaskError();
        }
    }

    setupEventListeners() {
        document.getElementById('connectWallet').addEventListener('click', () => {
            this.connectWallet();
        });

        document.getElementById('requestFaucet').addEventListener('click', () => {
            this.requestTestETH();
        });

        document.getElementById('setBalance').addEventListener('click', () => {
            this.setCustomBalance();
        });

        document.getElementById('simulateTransaction').addEventListener('click', () => {
            this.simulateTransaction();
        });

        document.getElementById('copyTxId').addEventListener('click', () => {
            this.copyTransactionId();
        });

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    this.account = accounts[0];
                    this.updateWalletInfo();
                } else {
                    this.disconnect();
                }
            });

            window.ethereum.on('chainChanged', (chainId) => {
                window.location.reload();
            });
        }
    }

    async connectWallet() {
        try {
            const connectBtn = document.getElementById('connectWallet');
            connectBtn.textContent = 'Connecting...';
            connectBtn.disabled = true;

            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.account = accounts[0];
            this.isConnected = true;
            
            await this.switchToTestnet();
            await this.updateWalletInfo();
            this.showWalletInfo();
            
            connectBtn.textContent = 'Connected!';
            
        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Please approve the connection in MetaMask to continue.');
            this.resetConnectButton();
        }
    }

    async switchToTestnet() {
        const sepoliaChainId = '0xaa36a7';
        
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: sepoliaChainId }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: sepoliaChainId,
                            chainName: 'Sepolia Test Network',
                            rpcUrls: ['https://sepolia.infura.io/v3/'],
                            nativeCurrency: {
                                name: 'Sepolia ETH',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            blockExplorerUrls: ['https://sepolia.etherscan.io']
                        }]
                    });
                } catch (addError) {
                    console.error('Error adding testnet:', addError);
                }
            }
        }
    }

    setCustomBalance() {
        const customBalanceInput = document.getElementById('customBalance');
        const balance = customBalanceInput.value;
        
        if (balance && !isNaN(balance) && parseFloat(balance) >= 0) {
            this.customBalance = parseFloat(balance).toFixed(8);
            this.updateDisplayedBalance();
            alert(`Balance set to ${this.customBalance} ETH`);
        } else {
            alert('Please enter a valid ETH amount');
        }
    }

    updateDisplayedBalance() {
        if (this.customBalance && this.customBalance !== '0.00') {
            document.getElementById('ethBalance').textContent = 
                `${this.customBalance} ETH`;
        }
    }

    simulateTransaction() {
        const txAmountInput = document.getElementById('transactionAmount');
        const amount = txAmountInput.value;
        
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            alert('Please enter a valid transaction amount');
            return;
        }

        this.updateTransactionDisplay(amount);
        document.getElementById('transactionDisplay').classList.remove('hidden');
        this.updateBalanceAfterTransaction(amount);
    }

    updateTransactionDisplay(amount) {
        document.getElementById('txAmount').textContent = `-${parseFloat(amount).toFixed(8)} ETH`;
        
        const gasLimit = 21000;
        const gasUsed = 21000;
        const baseFee = (0.000000001).toFixed(9);
        const priorityFee = '2';
        const totalGasFee = '0.000042';
        const usdValue = '0.15';

        document.getElementById('txGasLimit').textContent = gasLimit.toLocaleString();
        document.getElementById('txGasUsed').textContent = gasUsed.toLocaleString();
        document.getElementById('txBaseFee').textContent = baseFee;
        document.getElementById('txPriorityFee').textContent = priorityFee;
        document.getElementById('txTotalGasFee').innerHTML = 
            `${totalGasFee} ETH <span class="usd">$${usdValue}</span>`;
        document.getElementById('txMaxFee').innerHTML = 
            `0.000000002 ETH <span class="usd">$0.00</span>`;
        
        const txHash = '0x' + Math.random().toString(16).substr(2, 64);
        document.getElementById('viewBlockExplorer').href = 
            `https://sepolia.etherscan.io/tx/${txHash}`;
    }

    updateBalanceAfterTransaction(amount) {
        const currentBalance = parseFloat(this.customBalance || '0');
        const txAmount = parseFloat(amount);
        const gasFee = 0.000042;
        
        if (currentBalance >= (txAmount + gasFee)) {
            this.customBalance = (currentBalance - txAmount - gasFee).toFixed(8);
            this.updateDisplayedBalance();
        } else {
            alert('Insufficient balance for this transaction');
        }
    }

    copyTransactionId() {
        const fakeTxId = '0x' + Math.random().toString(16).substr(2, 64);
        navigator.clipboard.writeText(fakeTxId).then(() => {
            alert('Transaction ID copied to clipboard!');
        });
    }

    async updateWalletInfo() {
        if (!this.web3 || !this.account) return;

        try {
            const balanceWei = await this.web3.eth.getBalance(this.account);
            const realBalanceEth = this.web3.utils.fromWei(balanceWei, 'ether');
            
            const displayBalance = this.customBalance !== '0.00' ? 
                this.customBalance : parseFloat(realBalanceEth).toFixed(4);
            
            const chainId = await this.web3.eth.getChainId();
            const networkName = this.getNetworkName(chainId);

            document.getElementById('walletAddress').textContent = 
                `${this.account.substring(0, 6)}...${this.account.substring(38)}`;
            document.getElementById('ethBalance').textContent = 
                `${displayBalance} ETH`;
            document.getElementById('networkInfo').textContent = 
                `${networkName} (${chainId})`;

            if (parseFloat(realBalanceEth) < 0.1 && this.isTestnet(chainId)) {
                document.getElementById('faucet-section').classList.remove('hidden');
            } else {
                document.getElementById('faucet-section').classList.add('hidden');
            }

        } catch (error) {
            console.error('Error updating wallet info:', error);
        }
    }

    getNetworkName(chainId) {
        const networks = {
            1: 'Ethereum Mainnet',
            11155111: 'Sepolia Testnet',
            5: 'Goerli Testnet'
        };
        return networks[chainId] || `Network (${chainId})`;
    }

    isTestnet(chainId) {
        const testnetIds = [11155111, 5];
        return testnetIds.includes(chainId);
    }

    async requestTestETH() {
        if (!this.account) return;
        window.open(`https://sepoliafaucet.com/?address=${this.account}`, '_blank');
    }

    showWalletInfo() {
        document.getElementById('walletInfo').classList.remove('hidden');
        document.getElementById('connectWallet').style.display = 'none';
    }

    showMetaMaskError() {
        const connectBtn = document.getElementById('connectWallet');
        connectBtn.innerHTML = '⚠️ Install MetaMask';
        connectBtn.style.backgroundColor = '#dc3545';
        connectBtn.disabled = true;
    }

    resetConnectButton() {
        const connectBtn = document.getElementById('connectWallet');
        connectBtn.textContent = 'Connect MetaMask';
        connectBtn.disabled = false;
    }

    disconnect() {
        this.account = null;
        this.isConnected = false;
        document.getElementById('walletInfo').classList.add('hidden');
        document.getElementById('connectWallet').style.display = 'block';
        document.getElementById('faucet-section').classList.add('hidden');
        this.resetConnectButton();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WalletConnector();
});