# CSS Toggler

Allows for more quick CSS functionality, including but not limited to:
- Enabling and disabling snippets without even bothering about discarding it completely.
- Removing snippets straight from the original source or via the utility command.
- Detailing snippets with their own unique title and description so that they're easier to find.
- Sorting snippets by the order of applying, alphabetically, or author.
- Adding your own snippets without ever having to worry about botched formatting.
- Globally displaying the `Apply Snippet` button to all CSS formatted codeblock messages.
- Individually editing snippets straight from the settings page.

## Planned Features
- [ ] If a message is updated, update the snippet as well.

## Format
There are certain formats that we require for snippets to appear under the "CSS Toggler" tab. Lucky for you it is almost identical to the format that is used upon clicking the `Apply Snippet` button in #css-snippets. Below you'll find a showcase of the 3 (three) formats that are available.

### Snippets from Powercord's `#css-snippets` channel:
`{applied_date_time}` - A formatted date and time of when the snippet was applied (e.g. `Jan 1, 1970 at 12:00:00 AM`).<br/>
`{user_tag}` - The snippet author's tag (e.g. `M|-|4r13y ツ#1051`); in most cases this will already be filled in for you.<br/>
`{user_id}` - The snippet author's ID (e.g. `350227339784880130`); in most cases this will already be filled in for you.<br/>
`{message_id}` - The ID of the snippet (must be greater than `4194304`).<br/>
`{content}` - The content of the snippet.
```
/**
 * Snippet from #css-snippets applied the {applied_date_time}
 * Created by {user_tag} ({user_id})
 * Snippet ID: {message_id}
 */
{content}
/** {message_id} */
```

### Snippets from other server channels:
`{channel_name}` - The channel name of where the snippet was applied.<br/>
`{channel_id}` - The channel ID of where the snippet was applied.<br/>
`{applied_date_time}` - A formatted date and time of when the snippet was applied (e.g. `Jan 1, 1970 at 12:00:00 AM`).<br/>
`{user_tag}` - The snippet author's tag (e.g. `M|-|4r13y ツ#1051`); in most cases this will already be filled in for you.<br/>
`{user_id}` - The snippet author's ID (e.g. `350227339784880130`); in most cases this will already be filled in for you.<br/>
`{message_id}` - The ID of the snippet (must be greater than `4194304`).<br/>
`{content}` - The content of the snippet.
```
/**
 * Snippet from {channel_name} (#{channel_id}) applied the {applied_date_time}
 * Created by {user_tag} ({user_id})
 * Snippet ID: {message_id}
 */
{content}
/** {message_id} */
```

### Custom snippets:
`{applied_date_time}` - A formatted date and time of when the snippet was applied (e.g. `Jan 1, 1970 at 12:00:00 AM`).<br/>
`{current_user_tag}` - Your user tag (e.g. `M|-|4r13y ツ#1051`); in most cases this will already be filled in for you.<br/>
`{current_user_id}` - Your user ID (e.g. `350227339784880130`); in most cases this will already be filled in for you.<br/>
`{id}` - The ID of the snippet (custom snippets only accept IDs ranging from `1–4194304`).<br/>
`{content}` - The content of the snippet.

```
/**
 * Custom snippet applied the {applied_date_time}
 * Created by {current_user_tag} ({current_user_id})
 * Snippet ID: {id}
 */
{content}
/** {id} */
```