const React = require('react');

const CompLibrary = require('../../core/CompLibrary.js');

const Container = CompLibrary.Container;
const GridBlock = CompLibrary.GridBlock;

const SplashContainer = (props) => (
  <div className='homeContainer'>
    <div className='homeSplashFade'>
      <div className='wrapper homeWrapper'>{props.children}</div>
    </div>
  </div>
);

const ProjectTitle = (props) => (
  <h2 className='projectTitle'>
    CORMO
    <small>ORM framework for Node.js</small>
  </h2>
);

const PromoSection = (props) => (
  <div className='section promoSection'>
    <div className='promoRow'>
      <div className='pluginRowBlock'>{props.children}</div>
    </div>
  </div>
);

const Button = (props) => (
  <div className='pluginWrapper buttonWrapper'>
    <a className='button' href={props.href} target={props.target}>
      {props.children}
    </a>
  </div>
);

const Block = (props) => (
  <Container padding={['bottom', 'top']} id={props.id} background={props.background}>
    <GridBlock align='center' contents={props.children} layout={props.layout} />
  </Container>
);

const Features = (props) => (
  <Block layout='fourColumn' background='light'>
    {[
      {
        content: 'Support MySQL, MongoDB, PostgreSQL, SQLite',
        title: 'Multiple Database System',
      },
      {
        content: 'Support compile-time type checking',
        title: 'TypeScript friendly',
      },
    ]}
  </Block>
);

const HomeSplash = (props) => {
  const { siteConfig, language = '' } = props;
  const { baseUrl, docsUrl } = siteConfig;
  const docsPart = `${docsUrl ? `${docsUrl}/` : ''}`;
  const langPart = `${language ? `${language}/` : ''}`;
  const docUrl = (doc) => `${baseUrl}${docsPart}${langPart}${doc}`;

  return (
    <SplashContainer>
      <div className='inner'>
        <ProjectTitle />
        <PromoSection>
          <Button href={docUrl('getting-started.html')}>Getting Started</Button>
        </PromoSection>
      </div>
    </SplashContainer>
  );
};

const Index = (props) => {
  const { config: siteConfig, language = '' } = props;
  const { baseUrl } = siteConfig;

  return (
    <div>
      <HomeSplash siteConfig={siteConfig} language={language} />
      <div className='mainContainer'>
        <Features baseUrl={baseUrl} />
      </div>
    </div>
  );
};

module.exports = Index;
