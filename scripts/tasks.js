window.setTab = function (tabName) {
  document.querySelectorAll('.section').forEach(s => s.style.display = 'none');

  if (tabName === 'home') {
    document.getElementById('adminHome').style.display = 'block';
    return;
  }

  if (tabName === 'input') {
    document.getElementById('sectionInput').style.display = 'block';
    return;
  }

  if (tabName === 'list') {
    document.getElementById('sectionList').style.display = 'block';
    return;
  }

  if (tabName === 'done') {
    document.getElementById('sectionList').style.display = 'block';
    requestAnimationFrame(setupDoneFilterInputs);
    return;
  }

  // 하위탭 예: reservation, expense 등
  const id = 'section' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
  document.getElementById(id)?.classList.add('active');
};