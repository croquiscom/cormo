const React = require('react');

const CompLibrary = require('../../core/CompLibrary.js');

const Container = CompLibrary.Container;
const GridBlock = CompLibrary.GridBlock;

const SplashContainer = (props) => (
  <div className="homeContainer">
    <div className="homeSplashFade">
      <div className="wrapper homeWrapper">{props.children}</div>
    </div>
  </div>
);

const ProjectTitle = (props) => (
  <h2 className="projectTitle">
    CORMO
    <small>Node.js를 위한 ORM 프레임워크</small>
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

const Block = (props) => (
  <Container
    padding={['bottom', 'top']}
    id={props.id}
    background={props.background}>
    <GridBlock
      align="center"
      contents={props.children}
      layout={props.layout}
    />
  </Container>
);

const Features = (props) => (
  <Block layout="fourColumn" background="light">
    {[
      {
        content: 'MySQL, MongoDB, PostgreSQL, SQLite을 지원합니다',
        title: '다수의 데이터베이스 시스템',
      },
      {
        content: '컴파일 시점의 타입 체킹을 지원합니다',
        title: 'TypeScript 친화',
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
      <div className="inner">
        <ProjectTitle />
        <PromoSection>
          <Button href={docUrl('getting-started.html')}>시작하기</Button>
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
      <div className="mainContainer">
        <Features baseUrl={baseUrl} />
      </div>
    </div>
  );
};

module.exports = Index;
