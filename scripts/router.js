window.routeTo = async (name) => {
  const container = document.getElementById('routeContainer');
  container.innerHTML = '<p>로딩 중...</p>';
  const module = await import(`./scripts/routes/${name}.js`);
  module.render(container);
};
