import dynamic from 'next/dynamic';

// Dynamically import the App component to ensure it's only rendered on the client side
const App = dynamic(() => import('../components/App'), { ssr: false });

const HomePage = () => {
  return <App />;
};

export default HomePage;