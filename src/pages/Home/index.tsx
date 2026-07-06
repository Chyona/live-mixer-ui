import Footer from './Footer';

import './index.css';
import { useAppSEO } from '~/hooks/useAppSEO';
import { appConfig } from '~/utils/config';

const HomePage = () => {
  useAppSEO({
    title: '首页',
    path: '/',
    description: appConfig.description,
    keywords: `${appConfig.title}, React, Vite, Ant Design`,
    robots: 'index, follow',
    twitterCard: 'summary_large_image',
  });

  return (
    <div className="home-page overflow-hidden-x">
      <main className="home-page__hero">
        <h1>{appConfig.title}</h1>
        <p>{appConfig.description}</p>
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
