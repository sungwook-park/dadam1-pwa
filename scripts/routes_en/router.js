window.routeTo = async (name) => {
  const container = document.getElementById('routeContainer');
  container.innerHTML = '<p>로딩 중...</p>';
  try {
    const module = await import(`./scripts/routes_en/${name}.js`);
    module.render(container);
  } catch (err) {
    container.innerHTML = `<p style="color:red">❌ 불러오기 실패: ${err.message}</p>`;
  }
};
