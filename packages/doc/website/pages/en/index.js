const React = require('react');

const SplashContainer = (props) => (
  <div className="homeContainer">
    <div className="homeSplashFade">
      <div className="wrapper homeWrapper">{props.children}</div>
    </div>
  </div>
);

const ProjectTitle = (props) => (
  <h2 className="projectTitle">
    {props.title}
    <small>{props.tagline}</small>
  </h2>
);

const PromoSection = (props) => (
  <div className="section promoSection">
    <div className="promoRow">
      <div className="pluginRowBlock">{props.children}</div>
    </div>
  </div>
);

const Button = (props) => (
  <div className="pluginWrapper buttonWrapper">
    <a className="button" href={props.href} target={props.target}>
      {props.children}
    </a>
  </div>
);

const HomeSplash = (props) => {
  const { siteConfig, language = '' } = props;
  const { baseUrl, docsUrl } = siteConfig;
  const docsPart = `${docsUrl ? `${docsUrl}/` : ''}`;
  const langPart = `${language ? `${language}/` : ''}`;
  const docUrl = (doc) => `${baseUrl}${docsPart}${langPart}${doc}`;

  return (
    <SplashContainer>
      <div className="inner">
        <ProjectTitle tagline={siteConfig.tagline} title={siteConfig.title} />
        <PromoSection>
          <Button href={docUrl('getting-started.html')}>Getting Started</Button>
        </PromoSection>
      </div>
    </SplashContainer>
  );
};

const Index = (props) => {
  const { config: siteConfig, language = '' } = props;

  return (
    <div>
      <HomeSplash siteConfig={siteConfig} language={language} />
    </div>
  );
};

module.exports = Index;
