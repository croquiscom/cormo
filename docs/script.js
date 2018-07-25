$(function() {
  // make result of marked for pretty print
  $('pre code[class^="lang-"]').addClass('.prettyprint');
  window.prettyPrint && prettyPrint()
});

$('body').on('click', '.showcode', function () {
  $(this).next().toggle();
  $('body').scrollspy('refresh');
});

$('body').on('shown.bs.collapse hidden.bs.collapse', function () {
  $('body').scrollspy('refresh');
});

var $options_private = $('#options-private');
if (window.localStorage && window.localStorage.getItem('options-private')==='true') {
  $options_private.prop('checked', true);
}
function updatePrivate() {
  if (window.localStorage) {
    window.localStorage.setItem('options-private', $options_private.is(':checked'));
  }
  if ($options_private.is(':checked')) {
    $('.private').show();
  } else {
    $('.private').hide();
  }
  $('body').scrollspy('refresh');
}
$options_private.on('click', updatePrivate);
updatePrivate();
