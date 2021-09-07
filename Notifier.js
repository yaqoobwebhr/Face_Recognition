var Notificier = {
  showNotification: function (text) {
    const notification = document.createElement("div");
    notification.id = "notification";
    notification.className = "show";
    notification.innerHTML = `${text}`;
    document.body.appendChild(notification);
  },
};
