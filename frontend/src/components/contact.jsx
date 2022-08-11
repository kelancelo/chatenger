export default function Contact(props) {
    const unreadMessagesCount = props.messages.filter(message => !message.hasBeenRead).length
    return (
        <div
            className="contact" onClick={props.onClick}
            style={props.selectedUser === props.user.id ? { backgroundColor: 'var(--primary)' } : {}}
        >
            <div className="contact-img-container">
                <img src={props.user.picture} alt="contact image" />
                <div
                    className="status-indicator"
                    style={{ backgroundColor: props.user.isOnline ? 'lightgreen' : 'lightcoral' }}
                >
                </div>
            </div>
            <span>{props.user.givenName}</span>
            <div className="unread-messages-count" style={{ display: unreadMessagesCount ? 'block' : 'none' }}>
                {unreadMessagesCount}
            </div>
        </div>
    )
}
