export default function Contact(props) {
    return (
        <div
            className="contact" onClick={props.onClick}
            style={props.selectedUser === props.user.id ? { backgroundColor: '#283541' } : {}}
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
        </div>
    )
}
