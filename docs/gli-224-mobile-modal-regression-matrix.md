## GLI-224 logout modal regression matrix

| Area | Case | Expected evidence |
| --- | --- | --- |
| Narrow portrait | Open the account logout confirmation on a 320 px-wide Android viewport | Dialog uses 24 px horizontal gutters, has no fixed percentage width, and all content remains inside the available width. |
| Message wrapping | Render the logout confirmation copy | Text may wrap and shrink within the dialog rather than producing a horizontal overflow. |
| Actions | Render the cancel and destructive actions together | The action region uses the available dialog width, may wrap, and each vendor button retains its 50 px minimum touch target. |
| Native dismissal | Use Android Back/request close | Existing `onRequestClose` still calls the supplied dismiss handler once. |
| Web regression | Use the web dialog path | The existing portal selection and visual account regression remain unchanged. |

Security surface: presentation-only layout at the shared dialog boundary. The change introduces no user input, network, authorization, data, or logging path.
