import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Image, TextInput, ActivityIndicator, FlatList } from 'react-native-web';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import moment from 'moment';
import './App.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// API Configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Authentication Context
const AuthContext = React.createContext(null);

const useAuth = () => {
  return React.useContext(AuthContext);
};

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/token`, new URLSearchParams({
        'username': username,
        'password': password
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (username, email, password, fullName) => {
    try {
      await axios.post(`${API}/users`, {
        username,
        email,
        password,
        full_name: fullName
      });
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const fetchUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      if (error.response && error.response.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [token]);

  const value = {
    token,
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Components
const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const auth = useAuth();

  const handleSubmit = async () => {
    setError('');
    if (isRegistering) {
      if (!username || !email || !password) {
        setError('Please fill all required fields');
        return;
      }
      
      const success = await auth.register(username, email, password, fullName);
      if (success) {
        setIsRegistering(false);
      } else {
        setError('Registration failed. Username or email may be already taken.');
      }
    } else {
      if (!username || !password) {
        setError('Please enter username and password');
        return;
      }
      
      const success = await auth.login(username, password);
      if (!success) {
        setError('Invalid credentials');
      }
    }
  };

  return (
    <View style={styles.authContainer}>
      <View style={styles.authForm}>
        <Text style={styles.authTitle}>
          {isRegistering ? 'Create an Account' : 'Sign In'}
        </Text>
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
        />
        
        {isRegistering && (
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
        )}
        
        {isRegistering && (
          <TextInput
            style={styles.input}
            placeholder="Full Name (Optional)"
            value={fullName}
            onChangeText={setFullName}
          />
        )}
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSubmit}
        >
          <Text style={styles.buttonText}>
            {isRegistering ? 'Register' : 'Login'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setIsRegistering(!isRegistering)}
        >
          <Text style={styles.secondaryButtonText}>
            {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Header = () => {
  const auth = useAuth();
  
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Financial Research & Portfolio Monitor</Text>
      
      {auth.user && (
        <View style={styles.headerRight}>
          <Text style={styles.userGreeting}>Hello, {auth.user.username}</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={auth.logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const TabNavigation = ({ currentTab, setCurrentTab }) => {
  const tabs = ['Dashboard', 'Market', 'Portfolio', 'News', 'Settings'];
  
  return (
    <View style={styles.tabContainer}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tabButton,
            currentTab === tab && styles.activeTab
          ]}
          onPress={() => setCurrentTab(tab)}
        >
          <Text
            style={[
              styles.tabText,
              currentTab === tab && styles.activeTabText
            ]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const MarketCard = ({ data }) => {
  const isPositive = data.change > 0;
  
  return (
    <View style={styles.marketCard}>
      <View style={styles.marketCardHeader}>
        <Text style={styles.symbolText}>{data.symbol}</Text>
        <Text style={styles.priceText}>${data.price.toFixed(2)}</Text>
      </View>
      <View style={styles.changeContainer}>
        <Text
          style={[
            styles.changeText,
            isPositive ? styles.positiveChange : styles.negativeChange
          ]}
        >
          {isPositive ? '+' : ''}{data.change.toFixed(2)} ({data.change_percent.toFixed(2)}%)
        </Text>
      </View>
      <View style={styles.marketCardDetails}>
        <Text style={styles.detailText}>Volume: {data.volume?.toLocaleString()}</Text>
        <Text style={styles.detailText}>Market Cap: ${(data.market_cap / 1000000000).toFixed(2)}B</Text>
      </View>
    </View>
  );
};

const generateChartData = () => {
  const labels = Array.from({length: 30}, (_, i) => moment().subtract(29-i, 'days').format('MMM DD'));
  
  const datasetA = {
    label: 'Portfolio Value',
    data: Array.from({length: 30}, () => Math.floor(Math.random() * 5000) + 10000),
    borderColor: 'rgb(53, 162, 235)',
    backgroundColor: 'rgba(53, 162, 235, 0.5)',
  };
  
  const datasetB = {
    label: 'Market Index',
    data: Array.from({length: 30}, () => Math.floor(Math.random() * 5000) + 8000),
    borderColor: 'rgb(255, 99, 132)',
    backgroundColor: 'rgba(255, 99, 132, 0.5)',
  };
  
  return {
    labels,
    datasets: [datasetA, datasetB],
  };
};

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: true,
      text: '30-Day Performance',
    },
  },
  scales: {
    y: {
      ticks: {
        callback: (value) => `$${value}`
      }
    }
  }
};

const Dashboard = () => {
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  const chartData = generateChartData();
  
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await axios.get(
          `${API}/market/watchlist?symbols=AAPL,MSFT,GOOGL,AMZN,TSLA`,
          {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }
        );
        setMarketData(response.data);
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMarketData();
  }, [auth.token]);
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0366d6" />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Portfolio Overview</Text>
        <View style={styles.chartContainer}>
          <Line options={chartOptions} data={chartData} />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Watchlist</Text>
        <View style={styles.marketGrid}>
          {marketData.map((item) => (
            <MarketCard key={item.symbol} data={item} />
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Add to Portfolio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Create Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>View News</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const MarketScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/market/stock/${searchQuery}`,
        {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        }
      );
      setSearchResults([response.data]);
    } catch (error) {
      console.error('Error searching market data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Market Search</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter stock symbol (e.g., AAPL)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Search</Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <ActivityIndicator size="small" color="#0366d6" style={styles.searchLoading} />
        ) : (
          <View style={styles.resultsContainer}>
            {searchResults.map((item) => (
              <MarketCard key={item.symbol} data={item} />
            ))}
          </View>
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Indices</Text>
        <View style={styles.indicesGrid}>
          <View style={styles.indexCard}>
            <Text style={styles.indexName}>S&P 500</Text>
            <Text style={styles.indexValue}>4,682.24</Text>
            <Text style={styles.indexChange}>+0.48%</Text>
          </View>
          <View style={styles.indexCard}>
            <Text style={styles.indexName}>Dow Jones</Text>
            <Text style={styles.indexValue}>38,347.10</Text>
            <Text style={styles.indexChange}>+0.22%</Text>
          </View>
          <View style={styles.indexCard}>
            <Text style={styles.indexName}>NASDAQ</Text>
            <Text style={styles.indexValue}>14,610.64</Text>
            <Text style={styles.indexChange}>+0.73%</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const NewsItem = ({ item }) => {
  return (
    <View style={styles.newsItem}>
      <Text style={styles.newsTitle}>{item.title}</Text>
      <View style={styles.newsInfo}>
        <Text style={styles.newsSource}>{item.source}</Text>
        <Text style={styles.newsDate}>{moment(item.published_at).fromNow()}</Text>
      </View>
      <Text style={styles.newsSummary}>{item.summary}</Text>
      <View style={styles.newsFooter}>
        <Text style={styles.newsSentiment}>
          Sentiment: 
          <Text style={
            item.sentiment === 'positive' 
              ? styles.positiveSentiment 
              : item.sentiment === 'negative' 
                ? styles.negativeSentiment 
                : styles.neutralSentiment
          }>
            {' '}{item.sentiment}
          </Text>
        </Text>
        <Text style={styles.newsSymbols}>
          Related: {item.related_symbols.join(', ')}
        </Text>
      </View>
    </View>
  );
};

const NewsScreen = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get(
          `${API}/news`,
          {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }
        );
        setNews(response.data);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNews();
  }, [auth.token]);
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0366d6" />
        <Text style={styles.loadingText}>Loading news...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial News</Text>
        {news.map((item) => (
          <NewsItem key={item.id} item={item} />
        ))}
      </View>
    </ScrollView>
  );
};

const PortfolioScreen = () => {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const response = await axios.get(
          `${API}/portfolios`,
          {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }
        );
        setPortfolios(response.data);
      } catch (error) {
        console.error('Error fetching portfolios:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPortfolios();
  }, [auth.token]);
  
  const createPortfolio = async () => {
    try {
      const response = await axios.post(
        `${API}/portfolios`,
        {
          name: 'My Portfolio',
          description: 'My investment portfolio'
        },
        {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        }
      );
      setPortfolios([...portfolios, response.data]);
    } catch (error) {
      console.error('Error creating portfolio:', error);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0366d6" />
        <Text style={styles.loadingText}>Loading portfolios...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Portfolios</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={createPortfolio}
          >
            <Text style={styles.buttonText}>Create Portfolio</Text>
          </TouchableOpacity>
        </View>
        
        {portfolios.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              You don't have any portfolios yet. Create your first portfolio to start tracking your investments.
            </Text>
          </View>
        ) : (
          portfolios.map((portfolio) => (
            <View key={portfolio.id} style={styles.portfolioCard}>
              <Text style={styles.portfolioName}>{portfolio.name}</Text>
              {portfolio.description && (
                <Text style={styles.portfolioDescription}>{portfolio.description}</Text>
              )}
              <Text style={styles.portfolioDate}>
                Created: {moment(portfolio.created_at).format('MMM DD, YYYY')}
              </Text>
              
              {portfolio.assets && portfolio.assets.length > 0 ? (
                <View style={styles.assetsList}>
                  <Text style={styles.assetsHeader}>Assets:</Text>
                  {portfolio.assets.map((asset) => (
                    <View key={asset.id} style={styles.assetItem}>
                      <Text style={styles.assetSymbol}>{asset.asset_id}</Text>
                      <Text style={styles.assetQuantity}>{asset.quantity} shares</Text>
                      <Text style={styles.assetPrice}>${asset.purchase_price}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noAssetsText}>No assets in this portfolio</Text>
              )}
              
              <View style={styles.portfolioActions}>
                <TouchableOpacity style={styles.portfolioActionButton}>
                  <Text style={styles.actionButtonText}>Add Asset</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.portfolioActionButton}>
                  <Text style={styles.actionButtonText}>Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const SettingsScreen = () => {
  const auth = useAuth();
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  
  const toggleSetting = (setter) => () => setter(prev => !prev);
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Username:</Text>
            <Text style={styles.settingValue}>{auth.user?.username}</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Email:</Text>
            <Text style={styles.settingValue}>{auth.user?.email}</Text>
          </View>
          {auth.user?.full_name && (
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Full Name:</Text>
              <Text style={styles.settingValue}>{auth.user.full_name}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingToggle}>
            <Text style={styles.settingLabel}>Price Alerts</Text>
            <TouchableOpacity
              style={[styles.toggleButton, alertEnabled ? styles.toggleActive : styles.toggleInactive]}
              onPress={toggleSetting(setAlertEnabled)}
            >
              <View style={[styles.toggleHandle, alertEnabled ? styles.toggleHandleRight : styles.toggleHandleLeft]} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingToggle}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <TouchableOpacity
              style={[styles.toggleButton, darkMode ? styles.toggleActive : styles.toggleInactive]}
              onPress={toggleSetting(setDarkMode)}
            >
              <View style={[styles.toggleHandle, darkMode ? styles.toggleHandleRight : styles.toggleHandleLeft]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.dangerButton} onPress={auth.logout}>
            <Text style={styles.dangerButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const MainContent = () => {
  const [currentTab, setCurrentTab] = useState('Dashboard');
  
  const renderContent = () => {
    switch (currentTab) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Market':
        return <MarketScreen />;
      case 'Portfolio':
        return <PortfolioScreen />;
      case 'News':
        return <NewsScreen />;
      case 'Settings':
        return <SettingsScreen />;
      default:
        return <Dashboard />;
    }
  };
  
  return (
    <SafeAreaView style={styles.mainContainer}>
      <Header />
      <TabNavigation currentTab={currentTab} setCurrentTab={setCurrentTab} />
      {renderContent()}
    </SafeAreaView>
  );
};

const AppContent = () => {
  const auth = useAuth();
  
  if (auth.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0366d6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  return auth.token ? <MainContent /> : <LoginScreen />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  // Main containers
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  // Header
  header: {
    backgroundColor: '#0366d6',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userGreeting: {
    color: 'white',
    marginRight: 16,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  logoutText: {
    color: 'white',
    fontWeight: '500',
  },
  
  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0366d6',
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0366d6',
    fontWeight: 'bold',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  
  // Auth
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  authForm: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginBottom: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  primaryButton: {
    backgroundColor: '#0366d6',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#0366d6',
    fontSize: 14,
  },
  errorText: {
    color: '#e53e3e',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  // Market Card
  marketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  marketCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  marketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  symbolText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  changeContainer: {
    marginBottom: 12,
  },
  changeText: {
    fontWeight: '500',
    fontSize: 14,
  },
  positiveChange: {
    color: '#38a169',
  },
  negativeChange: {
    color: '#e53e3e',
  },
  marketCardDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  
  // Chart
  chartContainer: {
    height: 300,
    marginBottom: 16,
  },
  
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#0366d6',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    width: '30%',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  
  // Market Search
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#0366d6',
    borderRadius: 4,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchLoading: {
    marginVertical: 16,
  },
  resultsContainer: {
    marginTop: 16,
  },
  
  // Indices
  indicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  indexCard: {
    width: '30%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  indexName: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  indexValue: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  indexChange: {
    color: '#38a169',
    fontWeight: '500',
  },
  
  // News
  newsItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  newsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  newsSource: {
    color: '#666',
    fontWeight: '500',
  },
  newsDate: {
    color: '#888',
  },
  newsSummary: {
    marginBottom: 12,
    lineHeight: 20,
    color: '#444',
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  newsSentiment: {
    fontSize: 14,
    color: '#666',
  },
  positiveSentiment: {
    color: '#38a169',
    fontWeight: '500',
  },
  negativeSentiment: {
    color: '#e53e3e',
    fontWeight: '500',
  },
  neutralSentiment: {
    color: '#718096',
    fontWeight: '500',
  },
  newsSymbols: {
    fontSize: 14,
    color: '#0366d6',
  },
  
  // Portfolio
  portfolioCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  portfolioName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  portfolioDescription: {
    color: '#666',
    marginBottom: 8,
  },
  portfolioDate: {
    color: '#888',
    fontSize: 12,
    marginBottom: 16,
  },
  assetsList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  assetsHeader: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#444',
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  assetSymbol: {
    fontWeight: '500',
    color: '#333',
  },
  assetQuantity: {
    color: '#666',
  },
  assetPrice: {
    color: '#0366d6',
    fontWeight: '500',
  },
  noAssetsText: {
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
  },
  portfolioActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  portfolioActionButton: {
    backgroundColor: '#0366d6',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  addButton: {
    backgroundColor: '#0366d6',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  
  // Settings
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontWeight: '500',
    width: 100,
    color: '#444',
  },
  settingValue: {
    flex: 1,
    color: '#666',
  },
  settingToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#38a169',
  },
  toggleInactive: {
    backgroundColor: '#cbd5e0',
  },
  toggleHandle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  toggleHandleLeft: {
    alignSelf: 'flex-start',
  },
  toggleHandleRight: {
    alignSelf: 'flex-end',
  },
  dangerButton: {
    backgroundColor: '#e53e3e',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default App;
